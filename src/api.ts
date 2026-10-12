// The app talks to the brain through its own route prefix. Default is "/andrey"
// (the AI Studio build proxies it to ANDREY_BASE via Vite). A self-hosted build can
// inject `window.__ANDREY_BASE__` to point at a same-origin relay (e.g. "/Andrey/ui"),
// so the SPA and the brain share an origin — no CORS, no auth bridge, no token in the browser.
import {
  ArGuideResponse,
  ArCommitResponse,
  ArPayResponse,
  CabinetResponse,
} from "./types/ar";
import {
  CabinetPayload,
  RepairTicket,
  ChatAnswer,
} from "./types/cabinet";
import { MOCK_GUIDE_RESPONSE, MOCK_CABINET_RESPONSE } from "./mock/fixtures";
import { MOCK_CABINET_PAYLOAD, MOCK_CHAT_ANSWERS } from "./mock/cabinet";

const isMock =
  import.meta.env.VITE_AR_MOCK === "true" ||
  (typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("mock") === "1");

const BASE_OVERRIDE =
  (typeof window !== "undefined" && (window as any).__ANDREY_BASE__) || "";
export const PROXY_BASE = BASE_OVERRIDE || "/andrey";

export class ApiRefusalError extends Error {
  status: number;
  code?: string;
  data: any;
  payUrl?: string;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiRefusalError";
    this.status = status;
    this.data = data;
    this.code = data?.code;
    this.payUrl = data?.pay_url;
  }
}

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const txt = await res.text();
  let data: any = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = { raw: txt };
  }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message || data.code)) || res.statusText || String(res.status);
    throw new ApiRefusalError(res.status, msg, data);
  }
  return data;
}

export const api = {
  proxyBase: PROXY_BASE,

  // GET /api/health — backend connectivity check.
  health: () => jsonFetch(`${PROXY_BASE}/api/health`),

  // GET /api/capture — the filming contract (how to shoot the clip).
  capture: () => jsonFetch(`${PROXY_BASE}/api/capture`),

  // GET /api/blueprint — canonical specs for a model.
  blueprint: (model: string, useWeb = true) =>
    jsonFetch(
      `${PROXY_BASE}/api/blueprint?model=${encodeURIComponent(model)}&use_web=${useWeb}`
    ),

  // POST /api/verdict — diagnose from a symptom (no media).
  verdict: (body: { symptom?: string; model?: string; use_model?: boolean; email?: string }) =>
    jsonFetch(`${PROXY_BASE}/api/verdict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  // POST /api/flow — the whole pipeline in one call: passport + verdict + audio + ticket.
  flow: (files: File[], symptom: string, model: string, email?: string) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("symptom", symptom);
    fd.append("model", model);
    if (email) fd.append("email", email);
    return jsonFetch(`${PROXY_BASE}/api/flow`, { method: "POST", body: fd });
  },

  // POST /api/deeper — clarifier round when the verdict gate is "deeper".
  deeper: (files: File[], symptom: string, model: string, roundNo = 1, email?: string) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("symptom", symptom);
    fd.append("model", model);
    fd.append("round_no", String(roundNo));
    if (email) fd.append("email", email);
    return jsonFetch(`${PROXY_BASE}/api/deeper`, { method: "POST", body: fd });
  },

  // POST /api/passport — passport extraction from media.
  passport: (files: File[], model = "", useWeb = true) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("model", model);
    fd.append("use_web", String(useWeb));
    return jsonFetch(`${PROXY_BASE}/api/passport`, { method: "POST", body: fd });
  },

  // POST /api/handoff — hand the case to the workshop; returns the ticket.
  handoff: (body: {
    session_id?: string;
    model?: string;
    symptom?: string;
    paid_ar_credit_rub?: number;
    ar_tier?: number;
    email?: string;
  }) =>
    jsonFetch(`${PROXY_BASE}/api/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  // POST /api/ar/pay — hand off to ocStore order checkout (Spec A3 / B2)
  arPay: async (body: { session_id?: string; email?: string }): Promise<ArPayResponse> => {
    if (isMock) {
      return { ok: true, order_id: 9999, pay_url: "https://hi5.bike/index.php?route=checkout/checkout" };
    }
    return jsonFetch(`${PROXY_BASE}/api/ar/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  // POST /api/ar/commit — S2 -> S3 transition with payment/credit check (Spec A2 / B2)
  arCommit: async (body: { session_id?: string; use_credit?: boolean }): Promise<ArCommitResponse> => {
    if (isMock) {
      return {
        ok: true,
        stage: 3,
        stage_name: "S3_AR",
        fee_rub: body.use_credit ? 0 : 150,
        paid_with: body.use_credit ? "credit" : "yoomoney",
      };
    }
    return jsonFetch(`${PROXY_BASE}/api/ar/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  // GET /api/ar/guide — fetch AR guide with steps and pins (Spec B3)
  arGuide: async (jobCodes = "", symptom = ""): Promise<ArGuideResponse> => {
    if (isMock) {
      return MOCK_GUIDE_RESPONSE;
    }
    const q = new URLSearchParams();
    if (jobCodes) q.set("job_codes", jobCodes);
    if (symptom) q.set("symptom", symptom);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return jsonFetch(`${PROXY_BASE}/api/ar/guide${qs}`);
  },

  // GET /api/cabinet — legacy / raw cabinet
  cabinet: async (): Promise<CabinetResponse> => {
    if (isMock) {
      return MOCK_CABINET_RESPONSE;
    }
    return jsonFetch(`${PROXY_BASE}/api/cabinet`);
  },

  // GET /api/cabinet — unified cabinet payload (Round 9)
  cabinetPayload: async (): Promise<CabinetPayload> => {
    if (isMock) {
      return MOCK_CABINET_PAYLOAD;
    }
    return jsonFetch(`${PROXY_BASE}/api/cabinet`);
  },

  // GET /api/cabinet/job/{id} — single repair ticket
  cabinetTicket: async (jobId: number): Promise<RepairTicket> => {
    if (isMock) {
      const found = MOCK_CABINET_PAYLOAD.tickets.find((t) => t.job_id === jobId);
      if (found) return found;
      return MOCK_CABINET_PAYLOAD.tickets[0];
    }
    return jsonFetch(`${PROXY_BASE}/api/cabinet/job/${jobId}`);
  },

  // POST /api/cabinet/ask — AI chat grounded in customer records
  cabinetAsk: async (q: string, jobId?: number): Promise<ChatAnswer> => {
    if (isMock) {
      const lower = q.toLowerCase();
      for (const [key, answer] of Object.entries(MOCK_CHAT_ANSWERS)) {
        if (key !== "default" && lower.includes(key)) {
          return answer;
        }
      }
      return MOCK_CHAT_ANSWERS.default;
    }
    return jsonFetch(`${PROXY_BASE}/api/cabinet/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, job_id: jobId }),
    });
  },
};

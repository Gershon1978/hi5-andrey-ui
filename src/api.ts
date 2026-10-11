import { ArCommitResponse, ArGuideResponse, CabinetResponse } from "./types/ar";
import { mockArGuideResponse, mockCabinetResponse } from "./mock/arGuide";

const BASE_OVERRIDE =
  (typeof window !== "undefined" && (window as any).__ANDREY_BASE__) || "";
export const PROXY_BASE = BASE_OVERRIDE || "/andrey";

export class ApiError extends Error {
  status: number;
  code: string;
  payUrl?: string;
  feeRub?: number;

  constructor(message: string, status: number, code: string, payUrl?: string, feeRub?: number) {
    super(message);
    this.status = status;
    this.code = code || "";
    this.payUrl = payUrl;
    this.feeRub = feeRub;
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
    const msg = (data && (data.detail || data.error)) || res.statusText || String(res.status);
    throw new ApiError(
      msg,
      res.status,
      (data && data.code) || "",
      data && (data.pay_url || data.checkout_url),
      data && data.fee_rub
    );
  }
  return data;
}

const isMock = Boolean(import.meta.env.VITE_AR_MOCK === "true" || import.meta.env.VITE_AR_MOCK === "1");

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
  verdict: (body: { symptom?: string; model?: string; use_model?: boolean }) =>
    jsonFetch(`${PROXY_BASE}/api/verdict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  // POST /api/flow — the whole pipeline in one call: passport + verdict + audio + ticket.
  flow: (files: File[], symptom: string, model: string) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("symptom", symptom);
    fd.append("model", model);
    return jsonFetch(`${PROXY_BASE}/api/flow`, { method: "POST", body: fd });
  },

  // POST /api/deeper — clarifier round when the verdict gate is "deeper".
  deeper: (files: File[], symptom: string, model: string, roundNo = 1) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("symptom", symptom);
    fd.append("model", model);
    fd.append("round_no", String(roundNo));
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
  }) =>
    jsonFetch(`${PROXY_BASE}/api/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  // POST /api/ar/pay — ocStore checkout creation
  arPay: async (sessionId: string): Promise<{ ok: boolean; pay_url: string; session_id: string }> => {
    if (isMock) {
      return {
        ok: true,
        pay_url: "https://hi5.bike/index.php?route=checkout/checkout&mock_paid=1",
        session_id: sessionId,
      };
    }
    return jsonFetch(`${PROXY_BASE}/api/ar/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  // POST /api/ar/commit — S2 -> S3 transition (CAS, idempotent)
  arCommit: async (body: { session_id?: string; use_credit?: boolean }): Promise<ArCommitResponse> => {
    if (isMock) {
      if (body.use_credit) {
        return {
          ok: true,
          already: false,
          stage: 3,
          stage_name: "S3_AR",
          fee_rub: 0,
          paid_with: "credit",
        };
      }
      return {
        ok: true,
        already: false,
        stage: 3,
        stage_name: "S3_AR",
        fee_rub: 150,
        paid_with: "yoomoney",
      };
    }
    return jsonFetch(`${PROXY_BASE}/api/ar/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  // GET /api/ar/guide — fetch ordered repair steps & overlay pins
  arGuide: async (jobCodes = "", symptom = ""): Promise<ArGuideResponse> => {
    if (isMock) {
      return mockArGuideResponse;
    }
    const params = new URLSearchParams();
    if (jobCodes) params.append("job_codes", jobCodes);
    if (symptom) params.append("symptom", symptom);
    const qs = params.toString();
    return jsonFetch(`${PROXY_BASE}/api/ar/guide${qs ? `?${qs}` : ""}`);
  },

  // POST /api/media (or /api/deeper) — upload more media within the same session
  arAddMedia: async (sessionId: string, files: File[]): Promise<ArGuideResponse> => {
    if (isMock) {
      return mockArGuideResponse;
    }
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("session_id", sessionId);
    return jsonFetch(`${PROXY_BASE}/api/media`, {
      method: "POST",
      body: fd,
    });
  },

  // GET /api/cabinet — identity-required profile view
  cabinet: async (): Promise<CabinetResponse> => {
    if (isMock) {
      return mockCabinetResponse;
    }
    return jsonFetch(`${PROXY_BASE}/api/cabinet`);
  },
};

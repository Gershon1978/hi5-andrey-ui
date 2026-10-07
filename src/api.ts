// The app talks to the brain through its own route prefix. Default is "/andrey"
// (the AI Studio build proxies it to ANDREY_BASE via Vite). A self-hosted build can
// inject `window.__ANDREY_BASE__` to point at a same-origin relay (e.g. "/Andrey/ui"),
// so the SPA and the brain share an origin — no CORS, no auth bridge, no token in the browser.
const BASE_OVERRIDE =
  (typeof window !== "undefined" && (window as any).__ANDREY_BASE__) || "";
export const PROXY_BASE = BASE_OVERRIDE || "/andrey";

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const txt = await res.text();
  let data: any = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = { raw: txt };
  }
  if (!res.ok) throw new Error((data && data.detail) || res.statusText || String(res.status));
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
};

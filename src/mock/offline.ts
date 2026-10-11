// src/mock/offline.ts
// Offline fixtures for the funnel steps that the AI-mock did NOT cover.
//
// WHY THIS FILE EXISTS
// The draft mock only intercepted the AR calls (arPay/arCommit/arGuide/cabinet).
// Everything earlier still went through PROXY_BASE to the real network - and
// vite.config.ts proxies /andrey to https://hi5.bike/Andrey, i.e. PRODUCTION.
// A single click therefore spent real money (passport/flow = 25 RUB "media",
// verdict/blueprint = 12 RUB "expensive"). With these fixtures, VITE_AR_MOCK=true
// makes the WHOLE journey offline and deterministic, which is what lets the
// prototype be demoed and screenshotted safely.
//
// The shapes below follow the repo's own samples (examples/verdict.json) and the
// fields App.tsx actually reads - not a guess at the backend contract.

export const OFFLINE_SESSION_ID = "s_offline_demo_session";

// Result is discarded by App.tsx (a warm-up ping), so the shape is not load-bearing.
export const OFFLINE_HEALTH = { ok: true, version: "offline-mock" };

// Also discarded by App.tsx; mirrors examples/capture.json.
export const OFFLINE_CAPTURE = {
  ok: true,
  contract: {
    title: "Как снять велосипед",
    lines: [
      "1. Паспорт велосипеда: ведите камеру вдоль стороны трансмиссии ~10 секунд, без звука.",
      "2. Проблема: покажите узел крупным планом ~10 секунд, со звуком — скажите, что не так.",
      "Если уверенность ниже 80% — попросим 1–2 фото узла (не больше 2 раундов).",
    ],
    clips: [
      {
        kind: "passport",
        seconds: "~10 с",
        audio: "без звука",
        shows: "рама целиком, надписи бренда/модели, цепь/переключатель, тормоза",
      },
      {
        kind: "problem",
        seconds: "~10 с",
        audio: "со звуком",
        shows: "узел крупным планом + голосовой комментарий",
      },
    ],
  },
};

// App.tsx reads passport.identity.{make,model,year_window}, passport.blueprint
// (via getNonEmptyObjectEntries) and passport.required_parts (must be an Array).
export const OFFLINE_PASSPORT = {
  ok: true,
  session_id: OFFLINE_SESSION_ID,
  passport: {
    identity: {
      make: "Scott",
      model: "Big Jon 2020",
      year_window: "2019-2021",
      wheel_size: '26"',
      brake_type: "disc_hydraulic",
    },
    blueprint: {
      drivetrain: "1x10 Shimano Deore",
      brakes: "Shimano MT200",
    },
    required_parts: ["Тормозные колодки Shimano B01S / B03S / B05S"],
    fit_constraints: [],
  },
};

// gate MUST be "verdict": OfferScreen shows "✓ Диагноз установлен" only for that
// value, and App.tsx routes gate === "deeper" to the DEEPER state instead.
// job_code s10_pads is a REAL workshop code, and it must agree with the AR guide.
export const OFFLINE_VERDICT = {
  ok: true,
  session_id: OFFLINE_SESSION_ID,
  verdict: {
    symptom: "Стучит колодка при торможении",
    gate: "verdict",
    confidence: 88,
    round_no: 0,
    causes: [
      {
        label: "Износ или загрязнение тормозных колодок",
        confidence: 88,
        basis: "Стук и снижение тормозного усилия при сухой погоде",
        job_code: "s10_pads",
      },
    ],
    jobs: [
      {
        code: "s10_pads",
        name: "Замена колодок (пара, ободные или дисковые)",
        group: "Обычная",
        price_base: 600,
        price_diff: 1000,
        price_text: "600 – 1 000 ₽",
        minutes: "15–20 мин",
      },
    ],
    parts: ["Тормозные колодки Shimano B05S Resin"],
    constraints: [],
    // The 150 RUB DIY offer. OfferScreen renders this AFTER the free repair path.
    diy: {
      kind: "diy",
      label: "AI-ремонт — персональное сопровождение",
      price_text: "150 ₽",
      price_rub: 150,
      price_rub_hi: 150,
      tier: 1,
      detail: "Пошаговые карточки + разбор ваших фото и видео.",
    },
    workshop: {
      kind: "workshop",
      label: "Записаться в мастерскую",
      price_text: "600 – 1 000 ₽",
      price_rub: 600,
      price_rub_hi: 1000,
      detail: "Замена колодок мастером",
    },
    guarantee:
      "Если не получится доделать самому, вся сумма за AI-гид зачитывается как скидка на визит в мастерскую.",
    deeper: [],
    warnings: [],
  },
};

export const OFFLINE_FLOW = {
  ok: true,
  session_id: OFFLINE_SESSION_ID,
  passport: OFFLINE_PASSPORT.passport,
  verdict: OFFLINE_VERDICT.verdict,
  ticket: { ticket_id: "ticket_offline_101" },
};

export const OFFLINE_DEEPER = {
  ok: true,
  session_id: OFFLINE_SESSION_ID,
  verdict: { ...OFFLINE_VERDICT.verdict, confidence: 95, round_no: 1, warnings: [] },
};

export const OFFLINE_HANDOFF = {
  ok: true,
  ticket: { ticket_id: "ticket_offline_101", status: "created", price_estimate_rub: 600 },
};

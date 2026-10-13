import { ArGuideResponse, CabinetResponse } from "../types/ar";

export const MOCK_GUIDE_RESPONSE: ArGuideResponse = {
  ok: true,
  fee_rub: 150,
  tier: 1,
  session_id: "mock-sess-ar-12345",
  guide: {
    frame_aspect: 1.7778,
    steps: [
      {
        index: 1,
        instruction: "Очистите цепь и ролики заднего переключателя от грязи и старой смазки чистой ветошью.",
        job_code: "DR_CLEAN",
      },
      {
        index: 2,
        instruction: "Переключитесь на самую маленькую звезду кассеты и ослабьте зажимной винт троса переключателя.",
        job_code: "DR_CABLE",
      },
      {
        index: 3,
        instruction: "Отрегулируйте упорный винт H (High) так, чтобы верхний ролик встал строго под внешней гранью маленькой звезды.",
        job_code: "DR_LIMIT_H",
      },
      {
        index: 4,
        instruction: "Натяните трос рукой без провисания и затяните зажимной винт моментом 5–6 Нм.",
        job_code: "DR_TENSION",
      },
      {
        index: 5,
        instruction: "Вращая педали, переключайте передачи вверх по одной. При задержке переключения подкрутите барашек манетки на 1/2 оборота против часовой стрелки.",
        job_code: "DR_INDEX",
      },
    ],
    pins: [], // pins is empty today as per spec!
  },
  scope: [
    { code: "DR_ADJ", name: "Настройка заднего переключателя", minutes: "20", price_text: "600 ₽" },
  ],
};

// The FREE e-scooter lane — mirrors POST /api/scooter/code field-for-field, so the screen
// can be developed and reviewed with zero API spend. Never carries a price or a paid guide.
export const MOCK_SCOOTER_CODE: Record<string, any> = {
  matched: {
    ok: true,
    lane: "scooter_free",
    status: "matched",
    paid_diy: false,
    workshop_cta: true,
    headline: "Справка по коду ошибки самоката (бесплатно)",
    note: "Для самокатов мы не продаём AI-гид: это бесплатная справка, а при необходимости — запись в мастерскую.",
    brand: "Dualtron",
    scheme: "e_code",
    brands: ["dualtron"],
    advice: [
      {
        code: "E2",
        code_normalized: "E002",
        severity: "critical",
        system: "controller",
        what_it_means: "Неисправность контроллера (перегрев или пробой)",
        likely_cause: "Перегрев контроллера под нагрузкой или пробой силовых ключей",
        what_to_check: "Дайте остыть 15–30 минут; при повторе кода проверьте контроллер",
        safety: "Не продолжайте поездку, если код повторяется",
        source: "",
      },
    ],
    matches: [{ brand: "Dualtron", brand_key: "dualtron", model: "", scope: "model", code: "E2" }],
  },
  ambiguous_brand: {
    ok: true,
    lane: "scooter_free",
    status: "ambiguous_brand",
    paid_diy: false,
    workshop_cta: true,
    headline: "Справка по коду ошибки самоката (бесплатно)",
    note: "Для самокатов мы не продаём AI-гид: это бесплатная справка, а при необходимости — запись в мастерскую.",
    message: "Такой код есть у нескольких марок — уточните марку самоката, и я дам точный ответ.",
    brands: ["dualtron", "kugoo", "xiaomi"],
    advice: [],
    matches: [],
  },
  unknown: {
    ok: true,
    lane: "scooter_free",
    status: "unknown",
    paid_diy: false,
    workshop_cta: true,
    headline: "Справка по коду ошибки самоката (бесплатно)",
    note: "Для самокатов мы не продаём AI-гид: это бесплатная справка, а при необходимости — запись в мастерскую.",
    message:
      "Этот код не нашёлся в нашей базе. Проверьте, что он считан с дисплея полностью, или опишите, что происходит, — и мы подскажем, стоит ли ехать в мастерскую.",
    advice: [],
    matches: [],
  },
};

export const MOCK_CABINET_RESPONSE: CabinetResponse = {
  ok: true,
  customer_id: 1042,
  telephone: "+7 (999) 000-00-00",
  credits_open: 1,
  orders: [
    {
      order_id: 4108,
      date_added: "10.10.2026",
      total_rub: 3450,
      status: "Оплачен",
      is_parts: true,
    },
    {
      order_id: 3951,
      date_added: "02.09.2026",
      total_rub: 150,
      status: "Выполнен",
      is_parts: false,
    },
  ],
  jobs: [
    {
      session_id: "sess-past-981",
      created_at: "02.09.2026",
      bike: "Scott Scale 970",
      symptom: "Проскакивает цепь на 7-й передаче",
      stage: 3,
      stage_name: "AI-ремонт завершён",
    },
  ],
};

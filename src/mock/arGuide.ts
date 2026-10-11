import { ArGuideResponse, CabinetResponse } from "../types/ar";

export const mockArGuideResponse: ArGuideResponse = {
  ok: true,
  guide: {
    steps: [
      {
        index: 1,
        instruction: "Переключите цепь на самую маленькую звезду сзади и ослабьте натяжение троса.",
        job_code: "derailleur_h_limit",
      },
      {
        index: 2,
        instruction: "Вращайте винт H-limit по часовой стрелке, пока верхний ролик переключателя не встанет строго под внешней гранью малой звезды.",
        job_code: "derailleur_h_limit",
      },
      {
        index: 3,
        instruction: "Подтяните трос пальцами без провисания и затяните фиксирующий болт с усилием 5 Н·м.",
        job_code: "derailleur_cable_tension",
      },
      {
        index: 4,
        instruction: "Прокрутите педали и проверьте четкость заброса цепи на вторую и третью звезды.",
        job_code: "derailleur_cable_tension",
      },
    ],
    pins: [], // Locked spec: pins is [] today in production. text-only turn is designed fallback.
    frame_aspect: 1.7778, // 16:9
  },
  unsupported_or_workshop: false,
  scope: [
    {
      code: "derailleur_h_limit",
      name: "Настройка упора высоких передач H-limit",
      minutes: "10 мин",
      price_text: "150 ₽",
    },
    {
      code: "derailleur_cable_tension",
      name: "Натяжение и фиксация троса переключателя",
      minutes: "10 мин",
      price_text: "150 ₽",
    },
  ],
  workshop: [
    {
      code: "tune_rear_derailleur",
      name: "Комплексная настройка заднего переключателя в цехе",
      minutes: "20 мин",
      price_text: "600–900 ₽",
    },
  ],
  tier: 1,
  fee_rub: 150,
  session_id: "mock_session_s3_active",
};

export const mockCabinetResponse: CabinetResponse = {
  ok: true,
  customer_id: 1042,
  telephone: "+7 (999) 000-00-00",
  credits_open: 1, // ruling 3 refund credit earned from buying a part
  orders: [
    {
      order_id: 8812,
      date_added: "2026-10-10",
      total_rub: 4318,
      status: "Оплачен",
      is_parts: true,
    },
  ],
  jobs: [
    {
      session_id: "job_scott_derailleur_20261011",
      created_at: "2026-10-11 14:20",
      bike: "Scott Scale 970 (2021)",
      symptom: "Цепь скачет на малых звездах",
      stage: 3,
      stage_name: "S3_AR",
    },
  ],
};

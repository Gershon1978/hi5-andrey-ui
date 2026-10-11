import { ArGuideResponse, CabinetResponse } from "../types/ar";

export const mockArGuideResponse: ArGuideResponse = {
  ok: true,
  guide: {
    steps: [
      {
        index: 1,
        instruction: "Снимите колесо, отжав эксцентрик или выкрутив ось, чтобы открыть доступ к суппорту.",
        job_code: "s10_pads",
      },
      {
        index: 2,
        instruction: "Разогните и извлеките шплинт, фиксирующий колодки в тормозном калипере.",
        job_code: "s10_pads",
      },
      {
        index: 3,
        instruction: "Извлеките старые колодки вместе с распорной пружиной. Проверьте диск на наличие масла.",
        job_code: "s10_pads",
      },
      {
        index: 4,
        instruction: "Установите новые колодки с пружиной, вставьте шплинт и загните усик.",
        job_code: "s10_pads",
      },
    ],
    pins: [], // Locked spec: pins is [] today in production. text-only turn is designed fallback.
    frame_aspect: 1.7778, // 16:9
  },
  unsupported_or_workshop: false,
  scope: [
    {
      code: "s10_pads",
      name: "Замена колодок (пара, ободные или дисковые)",
      minutes: "15–20 мин",
      price_text: "600 – 1 000 ₽",
    },
  ],
  workshop: [
    {
      code: "s10_pads",
      name: "Замена колодок мастером в сервисе",
      minutes: "15–20 мин",
      price_text: "600 ₽",
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

export type CabinetSection = "bikes" | "repairs" | "parts" | "payments" | "messages";

export type CabinetStatus =
  | "viewed"
  | "recommended"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";

export const STATUS_LABEL: Record<CabinetStatus, string> = {
  viewed: "Просмотрено",
  recommended: "Рекомендовано",
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "В обработке",
  shipped: "В пути",
  delivered: "Доставлено",
  returned: "Возврат",
  cancelled: "Отменено",
};

export type HistoryKind = "repair" | "recommendation" | "purchase" | "return";

export const KIND_LABEL: Record<HistoryKind, string> = {
  repair: "Ремонт",
  recommendation: "Рекомендация",
  purchase: "Покупка",
  return: "Возврат",
};

export interface HistoryRow {
  id: string;
  date: string; // ISO date
  what: string;
  kind: HistoryKind;
  amount_rub: number | null; // null -> render an em dash
  status: CabinetStatus;
  ref: { job_id?: number; order_id?: number; product_id?: number };
}

export interface BikePassport {
  bike_id: number;
  nickname?: string;
  make: string;
  model: string;
  year_window?: string;
  photo_url?: string;
  confirmed: { label: string; value: string }[]; // confirmed specs only
  unknown: string[]; // explicitly unknown, never guessed
  repairs_count: number;
  last_service?: string;
}

export type PartState =
  | "recommended"
  | "viewed"
  | "carted"
  | "purchased"
  | "verified"
  | "shipped"
  | "installed";

export const PART_STATE_LABEL: Record<PartState, string> = {
  recommended: "Рекомендовано",
  viewed: "Просмотрено",
  carted: "В корзине",
  purchased: "Куплено",
  verified: "Проверено механиком",
  shipped: "Отправлено",
  installed: "Установлено",
};

export interface TicketPart {
  product_id: number;
  name: string;
  image_url?: string;
  state: PartState;
  fit_state: "confirmed" | "compatible_unverified" | "unresolved";
  price_rub: number | null; // null unless fit_state === "confirmed"
  order_id?: number;
}

export interface TicketMedia {
  id: number;
  kind: "photo" | "video";
  url: string;
  ts: string;
}

export interface TicketCause {
  code: string;
  label: string;
  confidence: number;
}

export interface TicketStep {
  index: number;
  title: string;
  instruction: string;
  image_url?: string;
}

export interface TicketEvent {
  ts: string;
  label: string;
}

export interface RepairTicket {
  job_id: number;
  created_at: string;
  status: CabinetStatus;
  bike_id: number;
  symptom: string;
  causes: TicketCause[]; // ALL detected problems
  selected_cause_code: string; // the one the plan is written for
  plan_text: string;
  steps: TicketStep[];
  media: TicketMedia[];
  parts: TicketPart[];
  verification?: {
    result: "fit" | "mismatch" | "insufficient_evidence";
    decided_at: string;
    findings: string;
  };
  events: TicketEvent[];
}

export interface CabinetPayload {
  ok: boolean;
  customer: { name: string; logged_in: boolean };
  summary: { free_repairs: number; bikes_count: number; active_repairs: number };
  bikes: BikePassport[];
  history: HistoryRow[];
  tickets: RepairTicket[];
}

export interface ChatAnswer {
  ok: boolean;
  answer: string;
  refs: { kind: string; id: number }[];
}

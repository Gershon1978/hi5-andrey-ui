export interface ArBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArPin {
  id: string;
  x: number; // centroid in normalized 0.0 - 1.0 coordinates
  y: number; // centroid in normalized 0.0 - 1.0 coordinates
  label: string;
  bbox?: ArBBox | null;
}

export interface ArStep {
  index: number;
  instruction: string;
  job_code?: string;
}

export interface ArGuide {
  steps: ArStep[];
  pins: ArPin[];
  frame_aspect: number;
}

export interface ArMenuRow {
  code: string;
  name: string;
  minutes?: string;
  price_text?: string;
}

export interface ArGuideResponse {
  ok: boolean;
  guide?: ArGuide;
  unsupported_or_workshop?: boolean;
  scope?: ArMenuRow[];
  workshop?: ArMenuRow[];
  tier?: number;
  fee_rub?: number;
  session_id?: string;
}

export interface ArCommitResponse {
  ok: boolean;
  already?: boolean;
  stage?: number;
  stage_name?: string;
  fee_rub?: number;
  paid_with?: "yoomoney" | "credit" | string;
  code?: string;
  pay_url?: string;
}

export interface ArPayResponse {
  ok: boolean;
  order_id?: number;
  pay_url?: string;
  code?: string;
  message?: string;
}

export interface CabinetOrder {
  order_id: number;
  date_added: string;
  total_rub: number;
  status: string;
  is_parts?: boolean;
}

export interface CabinetJob {
  session_id: string;
  created_at: string;
  bike: string;
  symptom: string;
  stage: number;
  stage_name: string;
}

export interface CabinetResponse {
  ok: boolean;
  customer_id?: number;
  telephone?: string;
  credits_open: number;
  orders: CabinetOrder[];
  jobs: CabinetJob[];
}

import { useEffect, useRef, useState } from "react";
import { api, ApiRefusalError } from "./api";
import { ArGuideResponse } from "./types/ar";
import { OfferScreen } from "./screens/OfferScreen";
import { ArGuideScreen } from "./screens/ArGuideScreen";
import { CabinetScreen } from "./screens/CabinetScreen";

type AppState =
  | "INTRO"
  | "CHOICE"
  | "PASSPORT"
  | "RECORD_PROBLEM"
  | "ANALYZING"
  | "VERDICT"
  | "DEEPER"
  | "TICKET"
  | "PARTS"
  | "AR_GUIDE"
  | "CABINET"
  // The FREE e-scooter lane: the class gate refused the clip (`not_a_bicycle`) and we offer
  // a typed display code instead. No price, no paid guide, no booking.
  | "SCOOTER";


const BLUEPRINT_LABELS: Record<string, string> = {
  bike: "Модель велосипеда",
  speeds: "Количество скоростей",
  chainring_layout: "Передние звезды",
  cassette_interface: "Барабан / кассета",
  derailleur_mount: "Крепление переключателя",
  rear_derailleur: "Задний переключатель",
  chain_spec: "Спецификация цепи",
  groupset: "Групсет",
  brake_type: "Тип тормозов",
  brake_mount: "Крепление тормозов",
  rotor_front_mm: "Передний ротор (мм)",
  rotor_rear_mm: "Задний ротор (мм)",
  brake_fluid: "Тормозная жидкость",
  brake_pad_shape: "Форма колодок",
  bb_shell: "Кареточный узел",
  headset: "Рулевая колонка",
  seatpost_diameter_mm: "Диаметр подседельного штыря",
  wheel_size: "Размер колес",
  front_axle: "Передняя ось",
  rear_axle: "Задняя ось",
  max_tire_width: "Максимальная ширина покрышек",
  frame_type: "Тип рамы",
  frame_material: "Материал рамы",
  source_note: "Источник данных",
};

/* Monoline inline SVG icons (stroke: 2.5, round caps, currentColor, no fill) */
function CameraIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function VideoCameraIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="13" height="14" rx="3" />
      <path d="m15 10 6-4v12l-6-4v-4z" />
    </svg>
  );
}

function CheckIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BicycleIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L8.5 9H12l3 4.5h3.5" />
      <path d="M5.5 17.5 10 9" />
    </svg>
  );
}

function ScooterIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="M7.5 18h9" />
      <path d="M12 18V8h4l2 7" />
      <path d="M15 6h3" />
      <path d="M9 12h3" />
    </svg>
  );
}

function GearIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ClipboardIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  );
}

function PrinterIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );
}

function RefreshIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function humanKey(key: string): string {
  if (BLUEPRINT_LABELS[key]) return BLUEPRINT_LABELS[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPlainObject(val: any): val is Record<string, any> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function getNonEmptyObjectEntries(obj: any): [string, any][] {
  if (!isPlainObject(obj)) return [];
  return Object.entries(obj).filter(([_, v]) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (isPlainObject(v) && Object.keys(v).length === 0) return false;
    return true;
  });
}

function formatConfidence(conf: any): number {
  if (typeof conf !== "number") return 0;
  return conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function App() {
  const [state, setState] = useState<AppState>("INTRO");
  const [userIntent, setUserIntent] = useState<"REPAIR" | "PARTS">("REPAIR");

  // User input metadata (ambient prompts)
  const [model, setModel] = useState("");
  const [showModelInput, setShowModelInput] = useState(false);
  const [symptom, setSymptom] = useState("");
  const [showSymptomInput, setShowSymptomInput] = useState(false);

  // Files
  const [bikeVideo, setBikeVideo] = useState<File | null>(null);
  const [problemVideo, setProblemVideo] = useState<File | null>(null);
  const [deeperFiles, setDeeperFiles] = useState<File[]>([]);

  // Async results
  const [passport, setPassport] = useState<any>(null);
  const [passportLoading, setPassportLoading] = useState(false);
  const [flowResult, setFlowResult] = useState<any>(null);
  const [ticket, setTicket] = useState<any>(null);

  // Status & long-running progress
  const [busy, setBusy] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [partsOrdered, setPartsOrdered] = useState(false);

  // AR & Cabinet state (Round 8)
  const [guideResponse, setGuideResponse] = useState<ArGuideResponse | null>(null);
  const [paidWithCredit, setPaidWithCredit] = useState(false);
  const [payUrl, setPayUrl] = useState<string | undefined>(undefined);
  const [arEmail, setArEmail] = useState("");
  const [previousState, setPreviousState] = useState<AppState>("VERDICT");
  const [openCreditsCount, setOpenCreditsCount] = useState<number>(0);

  // ── the FREE e-scooter lane ───────────────────────────────────────────────
  // The class gate answers `lane: "scooter_free"` + `gate: "not_a_bicycle"` for a scooter
  // (or a non-vehicle frame). Everything paid is then OFF the table — no verdict, no offer,
  // no booking — and the only intake is a typed code from the display.
  const [refusal, setRefusal] = useState<any>(null);
  const [codeQuery, setCodeQuery] = useState("");
  const [codeResult, setCodeResult] = useState<any>(null);
  const [codeBusy, setCodeBusy] = useState(false);

  // File input refs
  const bikeVideoInputRef = useRef<HTMLInputElement>(null);
  const problemVideoInputRef = useRef<HTMLInputElement>(null);
  const deeperInputRef = useRef<HTMLInputElement>(null);

  // Initial mount: check health, capture guidance, and check open credits if authenticated
  useEffect(() => {
    api.health().catch(() => {});
    api.capture().catch(() => {});
    api.cabinet()
      .then((c) => {
        if (c?.credits_open) setOpenCreditsCount(c.credits_open);
      })
      .catch(() => {});
    // Review hook (`?mock=1&lane=scooter`): open the free scooter lane with no API spend, so
    // the screen can be reviewed in a browser without uploading a clip.
    if (new URLSearchParams(location.search).get("lane") === "scooter") {
      adoptRefusal({ gate: "not_a_bicycle", lane: "scooter_free", vehicle_class: "e_scooter" },
                   { lane: "scooter_free", gate: "not_a_bicycle" });
    }
  }, []);

  // Timer for long-running calls
  useEffect(() => {
    let timer: any = null;
    if (busy) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [busy]);

  // Adopt the gate's refusal, wherever it appears (passport / flow / a 409). Returns true when
  // the session is a scooter free-lane session, so the caller can stop doing bicycle work.
  function adoptRefusal(passportLike: any, envelope?: any): boolean {
    const lane = envelope?.lane ?? passportLike?.lane;
    const gate = envelope?.gate ?? passportLike?.gate;
    if (lane !== "scooter_free" && gate !== "not_a_bicycle") return false;
    setRefusal({
      lane: lane || "scooter_free",
      gate: gate || "not_a_bicycle",
      vehicle_class: passportLike?.vehicle_class ?? envelope?.vehicle_class ?? "",
      message: envelope?.message || passportLike?.message || "",
    });
    // Nothing bicycle-shaped may survive into a state that can offer a paid path.
    setPassport(null);
    setFlowResult(null);
    setProblemVideo(null);
    setCodeResult(null);
    setErr(null);
    setState("SCOOTER");
    return true;
  }

  async function handleAskCode() {
    const q = codeQuery.trim();
    if (!q || codeBusy) return;
    setCodeBusy(true);
    setErr(null);
    try {
      setCodeResult(await api.scooterCode(q, model.trim()));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setCodeBusy(false);
    }
  }

  // When bike video is chosen: immediately trigger /api/passport in background
  async function handleBikeVideoSelected(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return;
    const file = filesList[0];
    setBikeVideo(file);
    setErr(null);
    setState("CHOICE");

    setPassportLoading(true);
    try {
      const p = await api.passport([file], model, true);
      // The class gate may refuse the clip outright (a scooter, or a frame with no vehicle
      // in it): then there is no bicycle identity to show and no paid lane to enter.
      if (adoptRefusal(p?.passport || p, p)) return;
      const resolved = p.passport || p;
      setPassport(resolved);
      if (resolved?.identity?.make || resolved?.identity?.model) {
        const fullModel = [resolved.identity.make, resolved.identity.model].filter(Boolean).join(" ");
        if (!model) setModel(fullModel);
      }
    } catch (e: any) {
      console.warn("Passport extraction fallback:", e);
    } finally {
      setPassportLoading(false);
    }
  }

  // Handle choice selection
  function handleSelectIntent(intent: "REPAIR" | "PARTS") {
    setUserIntent(intent);
    if (intent === "PARTS") {
      setState("PARTS");
    } else {
      setState("PASSPORT");
    }
  }

  // When problem video is chosen: immediately trigger /api/flow
  async function handleProblemVideoSelected(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return;
    const file = filesList[0];
    setProblemVideo(file);
    setErr(null);
    setState("ANALYZING");
    setBusy(true);

    try {
      const symptomText = symptom.trim() || "Шум или люфт в узле";
      const modelText = model || passport?.identity?.model || "";
      const res = await api.flow([file], symptomText, modelText);
      setFlowResult(res);
      if (adoptRefusal(res?.passport, res)) return;

      if (res?.passport && !passport) {
        setPassport(res.passport);
      }

      const verdict = res?.verdict;
      if (verdict?.gate === "deeper" && (verdict?.round_no ?? 0) < 2) {
        setState("DEEPER");
      } else {
        setState("VERDICT");
      }
    } catch (e: any) {
      if (e?.code === "not_a_bicycle" || e?.data?.code === "not_a_bicycle") {
        if (adoptRefusal({ gate: "not_a_bicycle", lane: "scooter_free" }, e.data)) return;
      }
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  // Retry problem video analysis
  async function retryProblemVideo() {
    if (!problemVideo) return;
    setErr(null);
    setBusy(true);
    try {
      const symptomText = symptom.trim() || "Шум или люфт в узле";
      const modelText = model || passport?.identity?.model || "";
      const res = await api.flow([problemVideo], symptomText, modelText);
      setFlowResult(res);
      const verdict = res?.verdict;
      if (verdict?.gate === "deeper" && (verdict?.round_no ?? 0) < 2) {
        setState("DEEPER");
      } else {
        setState("VERDICT");
      }
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  // Handle deeper clarifier upload
  async function handleDeeperSelected(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return;
    const newFiles = Array.from(filesList);
    setDeeperFiles(newFiles);
    setErr(null);
    setBusy(true);

    try {
      const currentRound = flowResult?.verdict?.round_no ?? 0;
      const nextRound = currentRound + 1;
      const symptomText = symptom.trim() || "Уточнение узла";
      const modelText = model || passport?.identity?.model || "";
      const res = await api.deeper(newFiles, symptomText, modelText, nextRound);
      const updatedVerdict = res.verdict || res;

      const updatedFlow = {
        ...flowResult,
        verdict: updatedVerdict,
      };
      setFlowResult(updatedFlow);

      if (updatedVerdict?.gate === "deeper" && (updatedVerdict?.round_no ?? nextRound) < 2) {
        setState("DEEPER");
      } else {
        setState("VERDICT");
      }
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  // B2: Start AI-Repair (150 RUB or credit) -> arPay -> arCommit -> arGuide
  async function handleStartAiRepair(email?: string, useCredit = false) {
    if (email) setArEmail(email);
    setBusy(true);
    setErr(null);
    setPayUrl(undefined);

    const sessionId = flowResult?.session_id;

    try {
      // If paying with money (not credit), initiate order with ocStore
      if (!useCredit) {
        try {
          const payRes = await api.arPay({ session_id: sessionId, email: email || arEmail });
          if (payRes.pay_url) {
            setPayUrl(payRes.pay_url);
          }
        } catch (e: any) {
          // If pay route returns refusal or error, capture it
          console.warn("arPay error:", e);
        }
      }

      // Now call POST /api/ar/commit
      const commitRes = await api.arCommit({
        session_id: sessionId,
        use_credit: useCredit,
      });

      if (commitRes.ok) {
        setPaidWithCredit(commitRes.paid_with === "credit");
        // Transition to S3: fetch the guide
        const verdict = flowResult?.verdict;
        const jobCodes = verdict?.causes
          ?.map((c: any) => c.job_code)
          .filter(Boolean)
          .join(",") || "";
        const guideRes = await api.arGuide(jobCodes, symptom);
        setGuideResponse(guideRes);
        setState("AR_GUIDE");
      }
    } catch (e: any) {
      if (e instanceof ApiRefusalError) {
        // The class gate's refusal, wherever it surfaces (verdict / commit): the free lane.
        if (e.code === "not_a_bicycle") {
          adoptRefusal({ gate: "not_a_bicycle", lane: "scooter_free",
                         vehicle_class: e.data?.vehicle_class }, e.data);
          return;
        }
        // Spec B5 & Refusal handling:
        // 402 payment_required -> return to offer with pay_url
        if (e.status === 402) {
          if (e.payUrl) setPayUrl(e.payUrl);
          setState("VERDICT");
          setErr("Требуется оплата 150 ₽ для доступа к персональному AI-ремонту.");
          return;
        }
        // 409 stage_skipped -> return to verdict
        if (e.status === 409 && (e.code === "stage_skipped" || e.message.includes("stage_skipped") || e.message.includes("verdict"))) {
          setState("VERDICT");
          setErr("Сначала необходимо завершить диагностику поломки.");
          return;
        }
        // 409 busy_lease -> resume / retry
        if (e.status === 409 || e.status === 429) {
          setErr("Сессия занята обработкой. Пожалуйста, повторите через несколько секунд.");
          return;
        }
        // 401 identity_required -> link to shop login
        if (e.status === 401) {
          setErr("Для использования кредита требуется войти в аккаунт hi5.bike.");
          return;
        }
      }
      setErr(e.message || "Не удалось запустить AI-ремонт");
    } finally {
      setBusy(false);
    }
  }

  // B3: Followup media re-ask (inside same job, never recharges)
  async function handleUploadMoreMedia(files: File[]) {
    if (files.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      // Re-ask clarifier media without charging
      const symptomText = symptom.trim() || "Дополнительный ракурс для AI-гида";
      const modelText = model || passport?.identity?.model || "";
      const currentRound = flowResult?.verdict?.round_no ?? 0;
      const res = await api.deeper(files, symptomText, modelText, currentRound + 1, arEmail);
      if (res?.verdict) {
        setFlowResult({
          ...flowResult,
          verdict: res.verdict,
        });
      }
      // Refresh guide
      const verdict = res?.verdict || flowResult?.verdict;
      const jobCodes = verdict?.causes
        ?.map((c: any) => c.job_code)
        .filter(Boolean)
        .join(",") || "";
      const refreshedGuide = await api.arGuide(jobCodes, symptom);
      setGuideResponse(refreshedGuide);
    } catch (e: any) {
      setErr(e.message || "Не удалось обновить гид по новому фото");
    } finally {
      setBusy(false);
    }
  }

  // B4: Start new repair with credit from cabinet
  async function handleStartNewWithCredit() {
    setState("VERDICT");
    await handleStartAiRepair(arEmail, true);
  }

  // Handoff to workshop
  async function handleHandoff() {
    setBusy(true);
    setErr(null);
    try {
      const verdict = flowResult?.verdict;
      const t = await api.handoff({
        session_id: flowResult?.session_id,
        model: model || passport?.identity?.model || "",
        symptom: symptom || "Заявка из AI-диагностики",
        paid_ar_credit_rub: verdict?.diy?.price_rub || 0,
        ar_tier: verdict?.diy?.tier || 0,
        email: arEmail || undefined,
      });
      setTicket(t.ticket || t);
      setState("TICKET");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }


  // Reset entire flow
  function handleReset() {
    setState("INTRO");
    setUserIntent("REPAIR");
    setModel("");
    setShowModelInput(false);
    setSymptom("");
    setShowSymptomInput(false);
    setBikeVideo(null);
    setProblemVideo(null);
    setDeeperFiles([]);
    setPassport(null);
    setFlowResult(null);
    setTicket(null);
    setBusy(false);
    setErr(null);
    setPartsOrdered(false);
    setRefusal(null);
    setCodeQuery("");
    setCodeResult(null);
    setCodeBusy(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function copyTicket() {
    if (!ticket) return;
    const lines = [
      "=== Заявка в мастерскую hi5.bike ===",
      ticket.bike_summary ? `Велосипед: ${ticket.bike_summary}` : "",
      ticket.fault_codes ? `Коды неисправностей: ${Array.isArray(ticket.fault_codes) ? ticket.fault_codes.join(", ") : ticket.fault_codes}` : "",
      ticket.detected_specs ? `Параметры: ${typeof ticket.detected_specs === "object" ? JSON.stringify(ticket.detected_specs) : ticket.detected_specs}` : "",
      ticket.paid_ar_credit_rub !== undefined ? `Скидка за AI-гид: ${ticket.paid_ar_credit_rub} ₽` : "",
      ticket.customer_note ? `Примечание: ${ticket.customer_note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Rotating analysis messages
  function getAnalysisMessage() {
    if (elapsedSeconds < 15) return "Изучаем трансмиссию и геометрию…";
    if (elapsedSeconds < 30) return "Слушаем аудиодорожку…";
    if (elapsedSeconds < 60) return "Сверяем параметры со справочником…";
    return "Андрей финализирует диагноз…";
  }

  const verdict = flowResult?.verdict;
  const roundNo = verdict?.round_no ?? 0;
  const isCapReached = roundNo >= 2;
  const bestCause = (verdict?.causes || [])
    .slice()
    .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))[0];

  // Tags for passport preview
  const blueprintEntries = getNonEmptyObjectEntries(passport?.blueprint);
  const passportTags = blueprintEntries.slice(0, 3).map(([k, v]) => `${humanKey(k)}: ${v}`);

  return (
    <main className="canvas">
      {/* Header */}
      <header className="app-header">
        <div className="avatar-wrap">
          <div className="avatar">А</div>
          <div className="online-ring" title="Андрей на связи" />
        </div>
        <div className="header-info">
          <div className="header-title">Андрей · AI-механик</div>
          <div className="header-sub">Мастерская hi5.bike</div>
        </div>
        <div className="header-actions">
          {state !== "CABINET" && (
            <button
              type="button"
              className="cabinet-nav-btn"
              onClick={() => {
                setPreviousState(state);
                setState("CABINET");
              }}
            >
              Кабинет
              {openCreditsCount > 0 && (
                <span className="credit-badge-pill" title={`Доступно бесплатных ремонтов: ${openCreditsCount}`}>
                  {openCreditsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Network Failure Banner (Edge Case §5) */}
      {err && (
        <div className="error-banner">
          <div>Что-то пошло не так при анализе. Попробуем ещё раз?</div>
          <button type="button" onClick={state === "ANALYZING" ? retryProblemVideo : () => setErr(null)}>
            Повторить
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={bikeVideoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          handleBikeVideoSelected(e.target.files);
          e.target.value = "";
        }}
      />

      <input
        ref={problemVideoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          handleProblemVideoSelected(e.target.files);
          e.target.value = "";
        }}
      />

      <input
        ref={deeperInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          handleDeeperSelected(e.target.files);
          e.target.value = "";
        }}
      />

      {/* =========================================================================
          S0: INTRO
          ========================================================================= */}
      {state === "INTRO" && (
        <>
          <div className="speech-bubble">
            «Привет, я AI-копия веломастера Андрея из мастерской hi5.bike. Чтобы я был полезен, сначала покажи, на чём катаешься.»
          </div>

          {/* Ambient Prompt: Model name */}
          {!showModelInput ? (
            <button
              type="button"
              className="ambient-toggle"
              onClick={() => setShowModelInput(true)}
            >
              + Назвать модель текстом
            </button>
          ) : (
            <div className="ambient-field">
              <input
                type="text"
                placeholder="Модель велосипеда (напр. Scott Big Jon)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          S2: CHOICE
          ========================================================================= */}
      {state === "CHOICE" && (
        <>
          {bikeVideo && (
            <div className="video-preview-unit">
              <div className="video-info">
                <VideoCameraIcon />
                <span>{bikeVideo.name} ({formatFileSize(bikeVideo.size)})</span>
              </div>
              <button
                type="button"
                className="btn-retake"
                onClick={() => bikeVideoInputRef.current?.click()}
              >
                Переснять
              </button>
            </div>
          )}

          <div className="speech-bubble">
            «Принял видео, изучаю байк. Что делаем дальше?»
          </div>

          <div className="choice-list">
            <div
              className={`choice-card ${userIntent === "REPAIR" ? "active" : ""}`}
              onClick={() => handleSelectIntent("REPAIR")}
            >
              <div className="choice-card-title">Помощь в ремонте</div>
              <div className="choice-card-sub">Разберёмся со звуками, люфтами и переключением</div>
            </div>

            <div
              className={`choice-card ${userIntent === "PARTS" ? "active" : ""}`}
              onClick={() => handleSelectIntent("PARTS")}
            >
              <div className="choice-card-title">Поиск запчастей</div>
              <div className="choice-card-sub">Определим стандарты цепи, колодок и расходников</div>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          S3: PASSPORT
          ========================================================================= */}
      {state === "PASSPORT" && (
        <>
          <div className="speech-bubble">
            «Я узнал твой байк: <strong>{passport?.identity?.make || model || "Велосипед"} {passport?.identity?.model || ""}</strong> {passport?.identity?.year_window ? `(${passport.identity.year_window})` : ""}. Теперь покажи, что случилось.»
          </div>

          <div className="card-unit">
            <span className="badge-tag"><CheckIcon /> Велосипед опознан</span>
            <div style={{ fontSize: "22px", fontWeight: 700, margin: "8px 0" }}>
              {[passport?.identity?.make, passport?.identity?.model, passport?.identity?.year_window].filter(Boolean).join(" ") || model || "Ваш велосипед"}
            </div>

            {passportTags.length > 0 && (
              <div className="tags-row">
                {passportTags.map((tag, i) => (
                  <span key={i} className="pill-tag">{tag}</span>
                ))}
              </div>
            )}

            {!showModelInput ? (
              <button
                type="button"
                className="micro-link"
                style={{ marginTop: "12px" }}
                onClick={() => setShowModelInput(true)}
              >
                Модель определена неверно
              </button>
            ) : (
              <div className="ambient-field" style={{ marginTop: "12px" }}>
                <input
                  type="text"
                  placeholder="Уточните модель (напр. Scott Big Jon 2020)"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Ambient Prompt: Symptom text */}
          {!showSymptomInput ? (
            <button
              type="button"
              className="ambient-toggle"
              onClick={() => setShowSymptomInput(true)}
            >
              + Написать симптом словами
            </button>
          ) : (
            <div className="ambient-field">
              <textarea
                rows={2}
                placeholder="Что беспокоит? (напр. цепь проскакивает при нагрузке)"
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          S4: ANALYZING
          ========================================================================= */}
      {state === "ANALYZING" && (
        <>
          {passport && (
            <div className="card-unit" style={{ padding: "16px 20px", marginBottom: "16px" }}>
              <span className="badge-tag"><BicycleIcon /> {passport?.identity?.make} {passport?.identity?.model}</span>
              <div style={{ fontSize: "14px", color: "var(--muted)", marginTop: "4px" }}>
                Байк зафиксирован. Слушаем видео проблемы…
              </div>
            </div>
          )}

          <div className="speech-bubble">
            «{getAnalysisMessage()}»
          </div>
        </>
      )}

      {/* =========================================================================
          S5: VERDICT / OFFER (Spec B1: free content -> free path -> 150 RUB offer)
          ========================================================================= */}
      {state === "VERDICT" && verdict && (
        <OfferScreen
          passport={passport}
          verdict={verdict}
          verdictSource={problemVideo ? "video" : "text"}
          isCapReached={isCapReached}
          onSelectAiRepair={(email) => handleStartAiRepair(email, false)}
          onHandoffWorkshop={handleHandoff}
          busy={busy}
          payUrl={payUrl}
          errorMessage={err}
        />
      )}

      {/* =========================================================================
          S3: AR_GUIDE (Spec B3: Ordered steps, overlay, followup media re-ask)
          ========================================================================= */}
      {state === "AR_GUIDE" && guideResponse && (
        <ArGuideScreen
          guideResponse={guideResponse}
          mediaFile={problemVideo || bikeVideo}
          paidWithCredit={paidWithCredit}
          onUploadMoreMedia={handleUploadMoreMedia}
          onFinishJob={() => setState("CABINET")}
          onOpenCabinet={() => {
            setPreviousState("AR_GUIDE");
            setState("CABINET");
          }}
          busy={busy}
        />
      )}

      {/* =========================================================================
          CABINET: Orders, Credits, Past Jobs, use credit action (Spec B4)
          ========================================================================= */}
      {state === "CABINET" && (
        <CabinetScreen
          onBackToCurrent={() => setState(previousState || "VERDICT")}
          onStartNewWithCredit={handleStartNewWithCredit}
          busy={busy}
        />
      )}

      {/* =========================================================================
          DEEPER: Clarifier photo asks (No prices!)
          ========================================================================= */}
      {state === "DEEPER" && verdict && (
        <>
          <div className="speech-bubble">
            «Звук неоднозначный (уверенность меньше 80%). Чтобы не гадать, снимите эти узлы крупнее:»
          </div>

          <div className="card-unit">
            <span className="badge-tag badge-warn">Уточнение {roundNo + 1} из 2</span>
            <ul style={{ margin: "12px 0 0", paddingLeft: "20px", fontSize: "16px", lineHeight: "1.6" }}>
              {verdict.deeper?.map((d: string, i: number) => (
                <li key={i}><strong>{d}</strong></li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* =========================================================================
          TICKET: Handoff confirmation
          ========================================================================= */}
      {state === "TICKET" && ticket && (
        <>
          <div className="speech-bubble">
            «Заявка передана механикам в hi5.bike. Мы уже ждём вас в мастерской.»
          </div>

          <div className="card-unit">
            <span className="badge-tag"><CheckIcon /> Заявка зарегистрирована</span>

            <div style={{ marginTop: "16px" }}>
              {ticket.bike_summary && (
                <div className="ticket-row">
                  <span className="ticket-label">Велосипед</span>
                  <span className="ticket-val">{ticket.bike_summary}</span>
                </div>
              )}
              {ticket.fault_codes && (
                <div className="ticket-row">
                  <span className="ticket-label">Коды неисправностей</span>
                  <span className="ticket-val">
                    {Array.isArray(ticket.fault_codes) ? ticket.fault_codes.join(", ") : String(ticket.fault_codes)}
                  </span>
                </div>
              )}
              {ticket.detected_specs && (
                <div className="ticket-row">
                  <span className="ticket-label">Определенные параметры</span>
                  <span className="ticket-val">
                    {isPlainObject(ticket.detected_specs)
                      ? Object.entries(ticket.detected_specs).map(([k, v]) => `${humanKey(k)}: ${v}`).join(" • ")
                      : String(ticket.detected_specs)}
                  </span>
                </div>
              )}
              {ticket.paid_ar_credit_rub !== undefined && (
                <div className="ticket-row">
                  <span className="ticket-label">Скидка на визит за AI-гид</span>
                  <span className="ticket-val" style={{ color: "var(--blue)" }}>
                    {ticket.paid_ar_credit_rub} ₽
                  </span>
                </div>
              )}
              {ticket.customer_note && (
                <div className="ticket-row">
                  <span className="ticket-label">Примечание</span>
                  <span className="ticket-val">{ticket.customer_note}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "20px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-pill secondary"
                style={{ flex: 1, minHeight: "44px", fontSize: "14px" }}
                onClick={copyTicket}
              >
                {copied ? <><CheckIcon /> Скопировано</> : <><ClipboardIcon /> Скопировать</>}
              </button>
              <button
                type="button"
                className="btn-pill secondary"
                style={{ flex: 1, minHeight: "44px", fontSize: "14px" }}
                onClick={() => window.print()}
              >
                <PrinterIcon /> Распечатать
              </button>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          PARTS: Specifications & parts search (no fake data)
          ========================================================================= */}
      {state === "PARTS" && (
        <>
          <div className="speech-bubble">
            «Определили стандарты и совместимые расходники для твоего байка:»
          </div>

          <div className="card-unit">
            <span className="badge-tag"><GearIcon /> Спецификации узлов</span>
            <div style={{ fontSize: "22px", fontWeight: 700, margin: "8px 0 16px" }}>
              {[passport?.identity?.make, passport?.identity?.model, passport?.identity?.year_window].filter(Boolean).join(" ") || model || "Велосипед"}
            </div>

            {blueprintEntries.length > 0 && (
              <table className="spec-table">
                <tbody>
                  {blueprintEntries.map(([k, v]) => (
                    <tr key={k}>
                      <td>{humanKey(k)}</td>
                      <td>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {Array.isArray(passport?.required_parts) && passport.required_parts.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "6px" }}>Расходники и запчасти:</div>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", lineHeight: "1.6" }}>
                  {passport.required_parts.map((p: any, i: number) => (
                    <li key={i}>{typeof p === "string" ? p : JSON.stringify(p)}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              className="micro-link"
              style={{ marginTop: "16px", display: "inline-flex", gap: "6px" }}
              onClick={() => setState("PASSPORT")}
            >
              <ArrowLeftIcon /> Перейти к диагностике поломки
            </button>
          </div>
        </>
      )}

      {/* =========================================================================
          S6: SCOOTER (free lane). The class gate refused the clip — either an e-scooter or a
          frame with no vehicle in it. No price, no paid guide, no booking: a typed display
          code is the only intake, answered from the canonical scooter list.
          ========================================================================= */}
      {state === "SCOOTER" && (
        <>
          <div className="speech-bubble">
            {refusal?.vehicle_class === "e_scooter"
              ? "«Это самокат — AI-ремонт велосипедов тут не подходит. Но по коду с дисплея дам бесплатную справку.»"
              : "«На видео не байк. Если это самокат — введите код с дисплея, справка бесплатная.»"}
          </div>

          <div className="card-unit">
            <span className="badge-tag"><ScooterIcon /> Самокат · бесплатная справка</span>
            <div style={{ fontSize: "14px", color: "var(--muted)", margin: "8px 0 12px" }}>
              {refusal?.message ||
                "Для самокатов мы не продаём AI-гид: только справка и, если нужно, запись в мастерскую."}
            </div>

            {!showModelInput ? (
              <button
                type="button"
                className="micro-link"
                style={{ marginBottom: "10px" }}
                onClick={() => setShowModelInput(true)}
              >
                Указать марку самоката
              </button>
            ) : (
              <div className="ambient-field" style={{ marginBottom: "10px" }}>
                <input
                  type="text"
                  placeholder="Марка (напр. Dualtron, Kugoo, Xiaomi)"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            )}

            <div className="ambient-field">
              <input
                type="text"
                placeholder="Код с дисплея (напр. E2 или «ошибка Е2»)"
                value={codeQuery}
                onChange={(e) => setCodeQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAskCode();
                }}
              />
            </div>

            <button
              type="button"
              className="ambient-toggle"
              style={{ marginTop: "12px" }}
              onClick={handleAskCode}
              disabled={codeBusy || !codeQuery.trim()}
            >
              {codeBusy ? "Смотрим в базе…" : "Что значит этот код?"}
            </button>
          </div>

          {codeResult && (
            <div className="card-unit">
              {Array.isArray(codeResult.advice) && codeResult.advice.length > 0 ? (
                <>
                  <span className="badge-tag"><CheckIcon /> Нашли в базе</span>
                  {codeResult.advice.length > 1 && (
                    <div style={{ fontSize: "14px", marginTop: "8px" }}>
                      В нашей базе у этого кода несколько значений — сверьтесь с моделью
                      самоката:
                    </div>
                  )}
                  {codeResult.advice.map((a: any, i: number) => (
                    <div key={i} style={{ marginTop: "12px" }}>
                      <div style={{ fontSize: "18px", fontWeight: 700 }}>
                        Код {a.code}
                        {a.severity === "critical" ? " · критичный" : ""}
                        {a.system && a.system !== "unknown" ? ` · ${a.system}` : ""}
                      </div>
                      <div style={{ fontSize: "15px", marginTop: "6px" }}>{a.what_it_means}</div>
                      {a.likely_cause && (
                        <div style={{ fontSize: "14px", color: "var(--muted)", marginTop: "6px" }}>
                          Причина: {a.likely_cause}
                        </div>
                      )}
                      {a.what_to_check && (
                        <div style={{ fontSize: "14px", marginTop: "6px" }}>
                          Что проверить: {a.what_to_check}
                        </div>
                      )}
                      {a.safety && (
                        <div style={{ fontSize: "14px", marginTop: "6px", color: "#c0392b" }}>
                          {a.safety}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "14px" }}>
                    {codeResult.note}
                  </div>
                </>
              ) : (
                <>
                  <span className="badge-tag">
                    {codeResult.status === "ambiguous_brand" ? "Нужна марка" : "Нет в базе"}
                  </span>
                  <div style={{ fontSize: "15px", marginTop: "8px" }}>
                    {codeResult.message}
                  </div>
                  {Array.isArray(codeResult.brands) && codeResult.brands.length > 0 && (
                    <div className="tags-row">
                      {codeResult.brands.map((b: string, i: number) => (
                        <span key={i} className="pill-tag">{b}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {err && (
            <div className="card-unit" style={{ borderColor: "#c0392b" }}>
              <div style={{ fontSize: "14px" }}>{err}</div>
            </div>
          )}

          <button
            type="button"
            className="micro-link"
            style={{ marginTop: "16px", display: "inline-flex", gap: "6px" }}
            onClick={handleReset}
          >
            <ArrowLeftIcon /> Начать заново
          </button>
        </>
      )}

      {/* =========================================================================
          MORPHING ACTION UNIT (Named Component: orbit_shutter / dual_pill / ring / typing)
          ========================================================================= */}
      {state !== "VERDICT" && state !== "AR_GUIDE" && state !== "CABINET" && state !== "SCOOTER" && (
        <footer className="action-dock">
          <div className="action-dock-inner">
            {/* INTRO state: Orbit Shutter */}
            {state === "INTRO" && (
              <div className="orbit-shutter-wrap">
                <button
                  type="button"
                  className={`orbit-shutter ${busy ? "recording" : ""}`}
                  onClick={() => bikeVideoInputRef.current?.click()}
                  aria-label="Показать велосипед"
                >
                  <div className="orbit-shutter-inner">
                    <VideoCameraIcon />
                  </div>
                </button>
                <div className="shutter-label">Показать велосипед</div>
                <div className="dock-caption">
                  Короткое видео 10 сек. без звука со стороны цепи
                </div>
              </div>
            )}

            {/* CHOICE state: DualPill / Thinking Bubble */}
            {state === "CHOICE" && (
              <>
                {passportLoading ? (
                  <div className="thinking-bubble">
                    <div className="typing-dots">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                    <div className="thinking-title">Изучаю геометрию и трансмиссию…</div>
                    <div className="thinking-message">Выберите направление выше</div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-pill"
                    onClick={() => handleSelectIntent(userIntent)}
                  >
                    Продолжить: {userIntent === "REPAIR" ? "Помощь в ремонте" : "Поиск запчастей"}
                  </button>
                )}
              </>
            )}

            {/* PASSPORT state: Orbit Shutter */}
            {state === "PASSPORT" && (
              <div className="orbit-shutter-wrap">
                <button
                  type="button"
                  className={`orbit-shutter ${busy ? "recording" : ""}`}
                  onClick={() => problemVideoInputRef.current?.click()}
                  aria-label="Снять видео поломки"
                >
                  <div className="orbit-shutter-inner">
                    <VideoCameraIcon />
                  </div>
                </button>
                <div className="shutter-label">Снять видео поломки</div>
                <div className="dock-caption">
                  Снимите 10 сек. со звуком: покрутите педали, пощелкайте переключателем или покажите место люфта.
                </div>
              </div>
            )}

            {/* ANALYZING state: Rim Ring + Thinking Bubble */}
            {state === "ANALYZING" && (
              <div className="ring-gauge-wrap">
                <div className="rim-ring">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="var(--wash)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="var(--blue)"
                      strokeWidth="5"
                      strokeDasharray="213.6"
                      strokeDashoffset={Math.max(0, 213.6 - (213.6 * Math.min(elapsedSeconds, 45)) / 45)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="rim-ring-seconds">{elapsedSeconds} с</span>
                </div>
                <div className="thinking-bubble">
                  <div className="typing-dots">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                  <div className="thinking-title">
                    Андрей слушает и анализирует…
                  </div>
                  <div className="thinking-message">
                    {getAnalysisMessage()}
                  </div>
                  <div className="thinking-note">
                    Это занимает около 30–45 секунд. Не закрывайте экран.
                  </div>
                </div>
              </div>
            )}

            {/* DEEPER state: Orbit Shutter for clarifier photos */}
            {state === "DEEPER" && (
              <div className="orbit-shutter-wrap">
                <button
                  type="button"
                  className={`orbit-shutter ${busy ? "recording" : ""}`}
                  onClick={() => deeperInputRef.current?.click()}
                  disabled={busy}
                  aria-label="Загрузить фото узла"
                >
                  <div className="orbit-shutter-inner">
                    <CameraIcon />
                  </div>
                </button>
                <div className="shutter-label">{busy ? "Андрей изучает фото…" : "Загрузить фото узла"}</div>
                <div className="dock-caption">
                  1–2 четких фото узла крупным планом
                </div>
              </div>
            )}

            {/* TICKET state: Restart action */}
            {state === "TICKET" && (
              <button
                type="button"
                className="btn-pill secondary"
                onClick={handleReset}
              >
                <RefreshIcon /> Начать заново
              </button>
            )}

            {/* PARTS state: Order CTA */}
            {state === "PARTS" && (
              <>
                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => setPartsOrdered(true)}
                >
                  {partsOrdered ? <><CheckIcon /> Запрос на запчасти отправлен</> : "Заказать через hi5.bike"}
                </button>
                <div className="dock-caption">
                  Механики проверят наличие на складе и свяжутся с вами
                </div>
              </>
            )}
          </div>
        </footer>
      )}
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import { api } from "./api";

type AppState =
  | "INTRO"
  | "CHOICE"
  | "PASSPORT"
  | "RECORD_PROBLEM"
  | "ANALYZING"
  | "VERDICT"
  | "DEEPER"
  | "TICKET"
  | "PARTS";

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
  // THE INTENT GATE: there is NO default. null = "not selected yet", and it can never
  // render a result — the analysis states are unreachable until a pill is tapped.
  const [userIntent, setUserIntent] = useState<"REPAIR" | "PARTS" | null>(null);

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

  // File input refs
  const bikeVideoInputRef = useRef<HTMLInputElement>(null);
  const problemVideoInputRef = useRef<HTMLInputElement>(null);
  const deeperInputRef = useRef<HTMLInputElement>(null);

  // Initial mount: check health and capture guidance
  useEffect(() => {
    api.health().catch(() => {});
    api.capture().catch(() => {});
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

  // Handle choice selection. The ONLY caller is a pill tap — never a default, never a timer.
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
      {/* Screen 0 mark: the avatar + online ring (the wheel motif). No title, no sub. */}
      <header className="app-header">
        <div className="avatar-wrap">
          <div className="avatar">А</div>
          <div className="online-ring" title="Андрей на связи" />
        </div>
      </header>

      {/* Network Failure Banner (Edge Case §5) */}
      {err && (
        <div className="error-banner">
          <div>Что-то пошло не так при анализе. Файлы сохранены. Попробуем ещё раз?</div>
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
        <div className="speech-bubble">
          «Покажите велосипед: 10 секунд, без звука.»
        </div>
      )}

      {/* =========================================================================
          S2: CHOICE
          ========================================================================= */}
      {state === "CHOICE" && (
        <>
          {bikeVideo && (
            <div className="video-preview-unit">
              <div className="video-info">
                <span>🎥</span>
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

          {/* THE ASK (the intent gate). Owner's ruling: the user MUST choose BEFORE we output
              ANY result of this video — no identity, no spec, no fault, no price. It is asked
              WHILE we analyse, so the decision overlaps our processing. */}
          <div className="speech-bubble">
            «Пока изучаю видео, чем помочь?»
          </div>

          {/* dual_pill — Hub Choice (DualPill). Two 96px cards: a 56px round wash badge with a 32px
              monoline glyph, the owner's frozen label, and the action as the sub-label. The tap IS
              the commit — these two cards are the ONLY way out of this screen. */}
          <div className="choice-list">
            <button
              type="button"
              className={`choice-card ${userIntent === "REPAIR" ? "active" : ""}`}
              aria-label="Помощь в ремонте: найти и устранить поломку"
              onClick={() => handleSelectIntent("REPAIR")}
            >
              <span className="choice-card-badge">
                {/* monoline combination spanner at 45° — open-end jaw + box ring */}
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </span>
              <span className="choice-card-text">
                <span className="choice-card-title">Помощь в ремонте</span>
                <span className="choice-card-sub">Найти и устранить поломку</span>
              </span>
            </button>

            <button
              type="button"
              className={`choice-card ${userIntent === "PARTS" ? "active" : ""}`}
              aria-label="Поиск запчастей: подобрать совместимую деталь"
              onClick={() => handleSelectIntent("PARTS")}
            >
              <span className="choice-card-badge">
                {/* monoline cassette: a 3-sprocket stepped cluster (teeth + HG spline).
                    stroke 2, not 2.5 — three concentric rings would fuse at 32 px. */}
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9.5" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2.5" />
                  <path d="M12 2.5V1M19.8 4.2 20.9 3.1M21.5 12H23M19.8 19.8l1.1 1.1M12 21.5V23M4.2 19.8 3.1 20.9M2.5 12H1M4.2 4.2 3.1 3.1" />
                </svg>
              </span>
              <span className="choice-card-text">
                <span className="choice-card-title">Поиск запчастей</span>
                <span className="choice-card-sub">Подобрать совместимую деталь</span>
              </span>
            </button>
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
            <span className="badge-tag">✓ Велосипед опознан</span>
            <div style={{ fontSize: "18px", fontWeight: 700, margin: "4px 0" }}>
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
                Модель определена неверно?
              </button>
            ) : (
              <div className="ambient-field" style={{ marginTop: "10px" }}>
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
            <div className="card-unit" style={{ padding: "12px 16px", marginBottom: "12px" }}>
              <span className="badge-tag">🚲 {passport?.identity?.make} {passport?.identity?.model}</span>
              <div style={{ fontSize: "14px", color: "var(--muted)" }}>
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
          S5: VERDICT_FORK
          ========================================================================= */}
      {state === "VERDICT" && verdict && (
        <>
          <div className="speech-bubble">
            «Вот что удалось определить по звуку и механике:»
          </div>

          {/* 2-round cap limit notification if reached */}
          {isCapReached && verdict.gate !== "verdict" && (
            <div className="badge-tag badge-warn" style={{ display: "block", textAlign: "center", padding: "8px 12px" }}>
              Достигнут лимит уточнений. Показываем наиболее вероятный диагноз.
            </div>
          )}

          {/* Causes */}
          <div className="card-unit">
            <div className="card-title">Вероятные причины</div>
            <div className="causes-list">
              {verdict.causes?.map((c: any, i: number) => (
                <div key={i} className="cause-item">
                  <span className="cause-label">{c.label}</span>
                  <span className="cause-conf">{formatConfidence(c.confidence)}%</span>
                </div>
              ))}
            </div>

            {/* Fork Cards (DIY / Workshop) */}
            <div className="fork-grid">
              <div className="fork-card">
                <h4>Сделать самому</h4>
                <p>{verdict.diy?.label || "Пошаговый AI-гид по ремонту"}</p>
                {verdict.diy?.price_text && (
                  <div className="fork-price">{verdict.diy.price_text}</div>
                )}
                {typeof verdict.diy?.price_rub === "number" && !verdict.diy?.price_text && (
                  <div className="fork-price">{verdict.diy.price_rub} ₽</div>
                )}
              </div>

              <div className="fork-card">
                <h4>В мастерской hi5.bike</h4>
                <p>{verdict.workshop?.detail || "Сделаем всё за вас с гарантией"}</p>
                {verdict.workshop?.price_text && (
                  <div className="fork-price">{verdict.workshop.price_text}</div>
                )}
              </div>
            </div>

            {verdict.guarantee && (
              <div className="guarantee-note">{verdict.guarantee}</div>
            )}
          </div>
        </>
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
            <ul style={{ margin: "12px 0 0", paddingLeft: "20px", fontSize: "15px", lineHeight: "1.6" }}>
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
            <span className="badge-tag">✓ Заявка зарегистрирована</span>

            <div style={{ marginTop: "12px" }}>
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
                  <span className="ticket-val" style={{ color: "var(--ok)" }}>
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

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-pill secondary"
                style={{ flex: 1, minHeight: "44px", fontSize: "14px" }}
                onClick={copyTicket}
              >
                {copied ? "✓ Скопировано" : "📋 Скопировать"}
              </button>
              <button
                type="button"
                className="btn-pill secondary"
                style={{ flex: 1, minHeight: "44px", fontSize: "14px" }}
                onClick={() => window.print()}
              >
                🖨️ Распечатать
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
            <span className="badge-tag">⚙️ Спецификации узлов</span>
            <div style={{ fontSize: "17px", fontWeight: 700, margin: "6px 0 12px" }}>
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
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>Расходники и запчасти:</div>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px" }}>
                  {passport.required_parts.map((p: any, i: number) => (
                    <li key={i}>{typeof p === "string" ? p : JSON.stringify(p)}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              className="micro-link"
              style={{ marginTop: "16px", display: "inline-block" }}
              onClick={() => setState("PASSPORT")}
            >
              ← Перейти к диагностике поломки
            </button>
          </div>
        </>
      )}

      {/* =========================================================================
          MORPHING ACTION UNIT (Persistent at Bottom)
          ========================================================================= */}
      <footer className="action-dock">
        <div className="action-dock-inner">
          {/* Screen 0: the ORBIT SHUTTER — the ONLY control. Opens the native camera. */}
          {state === "INTRO" && (
            <button
              type="button"
              className="orbit-shutter"
              aria-label="Показать велосипед"
              onClick={() => bikeVideoInputRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                <path d="M6.7 6.7l2.1 2.1M15.2 15.2l2.1 2.1M17.3 6.7l-2.1 2.1M8.8 15.2l-2.1 2.1" />
              </svg>
            </button>
          )}

          {/* CHOICE = the parked receipt. The two pills ARE the only control:
              no "Продолжить", no default — the gate holds until an intent is tapped. */}
          {state === "CHOICE" && passportLoading && (
            <div className="progress-gauge">
              <div className="progress-title">Изучаю геометрию и трансмиссию…</div>
              <div className="progress-message">Выберите направление выше</div>
            </div>
          )}

          {/* PASSPORT state */}
          {state === "PASSPORT" && (
            <>
              <button
                type="button"
                className="btn-pill"
                onClick={() => problemVideoInputRef.current?.click()}
              >
                🎥 Снять видео поломки
              </button>
              <div className="dock-caption">
                Снимите 10 сек. со звуком: покрутите педали, пощелкайте переключателем или покажите место люфта.
              </div>
            </>
          )}

          {/* ANALYZING state */}
          {state === "ANALYZING" && (
            <div className="progress-gauge">
              <div className="progress-title">
                Андрей слушает и анализирует… ({elapsedSeconds} с)
              </div>
              <div className="progress-message">
                {getAnalysisMessage()}
              </div>
              <div className="progress-note">
                Это занимает около 30–45 секунд. Не закрывайте экран.
              </div>
            </div>
          )}

          {/* VERDICT state */}
          {state === "VERDICT" && (
            <button
              type="button"
              className="btn-pill"
              onClick={handleHandoff}
              disabled={busy}
            >
              {busy ? "Оформляем заявку…" : "Передать заявку в hi5.bike"}
            </button>
          )}

          {/* DEEPER state */}
          {state === "DEEPER" && (
            <>
              <button
                type="button"
                className="btn-pill"
                onClick={() => deeperInputRef.current?.click()}
                disabled={busy}
              >
                {busy ? "Андрей изучает фото…" : "📷 Загрузить фото узла"}
              </button>
              <div className="dock-caption">
                1–2 четких фото узла крупным планом
              </div>
            </>
          )}

          {/* TICKET state */}
          {state === "TICKET" && (
            <button
              type="button"
              className="btn-pill secondary"
              onClick={handleReset}
            >
              ↻ Начать заново
            </button>
          )}

          {/* PARTS state */}
          {state === "PARTS" && (
            <>
              <button
                type="button"
                className="btn-pill"
                onClick={() => setPartsOrdered(true)}
              >
                {partsOrdered ? "✓ Запрос на запчасти отправлен" : "Заказать через hi5.bike"}
              </button>
              <div className="dock-caption">
                Механики проверят наличие на складе и свяжутся с вами
              </div>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}

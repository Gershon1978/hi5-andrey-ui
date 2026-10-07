import { useEffect, useRef, useState } from "react";
import { api } from "./api";

interface UploadItem {
  file: File;
  thumbUrl?: string;
}

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
  seatpost_diameter_mm: "Диаметр подседельного штыря (мм)",
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
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatConfidence(conf: any): number {
  if (typeof conf !== "number") return 0;
  return conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
}

function tierName(tier?: number): string {
  if (tier === 1) return "1 (Простая)";
  if (tier === 2) return "2 (Обычная)";
  if (tier === 3) return "3 (Экспертная)";
  return tier ? String(tier) : "";
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

export default function App() {
  const [contract, setContract] = useState<any>(null);
  const [health, setHealth] = useState<"checking" | "ok" | "fail">("checking");
  const [model, setModel] = useState("");
  const [symptom, setSymptom] = useState("");
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [deeperFiles, setDeeperFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [deeperBusy, setDeeperBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [savedSession, setSavedSession] = useState<{ result: any; model: string; symptom: string } | null>(null);
  const [dismissedResume, setDismissedResume] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Keep a ref to files to revoke object URLs on unmount
  const filesRef = useRef<UploadItem[]>(files);
  filesRef.current = files;

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => {
        if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      });
    };
  }, []);

  async function checkHealth() {
    setHealth("checking");
    try {
      const res = await api.health();
      if (res?.ok) {
        setHealth("ok");
      } else {
        setHealth("fail");
      }
    } catch {
      setHealth("fail");
    }
  }

  // Initial load: check health, capture guidance, check saved session in localStorage
  useEffect(() => {
    checkHealth();
    api.capture().then(setContract).catch((e) => setErr(String(e)));

    try {
      const raw = localStorage.getItem("andrey_saved_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.result) {
          setSavedSession(parsed);
        }
      }
    } catch {}
  }, []);

  // Save session when result updates
  useEffect(() => {
    if (result) {
      try {
        localStorage.setItem(
          "andrey_saved_session",
          JSON.stringify({ result, model, symptom, ts: Date.now() })
        );
      } catch {}
    }
  }, [result, model, symptom]);

  // Long-running analysis timer
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

  async function run() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const rawFiles = files.map((f) => f.file);
      const r = await api.flow(rawFiles, symptom, model);
      setResult(r);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runDeeper() {
    if (!result?.verdict) return;
    setDeeperBusy(true);
    setErr(null);
    try {
      const currentRound = result.verdict.round_no ?? 0;
      const nextRound = currentRound + 1;
      const res = await api.deeper(deeperFiles, symptom, model, nextRound);
      const updatedVerdict = res.verdict || res;
      setResult((prev: any) => ({
        ...prev,
        verdict: updatedVerdict,
      }));
      setDeeperFiles([]);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setDeeperBusy(false);
    }
  }

  function resetAll() {
    files.forEach((item) => {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    });
    setModel("");
    setSymptom("");
    setFiles([]);
    setDeeperFiles([]);
    setBusy(false);
    setDeeperBusy(false);
    setErr(null);
    setResult(null);
    setElapsedSeconds(0);
    setSavedSession(null);
    try {
      localStorage.removeItem("andrey_saved_session");
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restoreSavedSession() {
    if (!savedSession) return;
    setResult(savedSession.result);
    setModel(savedSession.model || "");
    setSymptom(savedSession.symptom || "");
    setSavedSession(null);
  }

  function handleAddFiles(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;
    const newItems: UploadItem[] = Array.from(newFiles).map((file) => {
      const isImage = file.type.startsWith("image/");
      const thumbUrl = isImage ? URL.createObjectURL(file) : undefined;
      return { file, thumbUrl };
    });
    setFiles((prev) => [...prev, ...newItems]);
  }

  function handleRemoveFile(index: number) {
    setFiles((prev) => {
      const target = prev[index];
      if (target?.thumbUrl) {
        URL.revokeObjectURL(target.thumbUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  const passport = result?.passport;
  const verdict = result?.verdict;
  const ticket = result?.ticket;

  // Round capping logic: when round_no >= 2, stop asking for clarifiers and show the best cause fork
  const roundNo = verdict?.round_no ?? 0;
  const isCapReached = roundNo >= 2;
  const showFork = verdict?.gate === "verdict" || isCapReached;

  // Best cause for fallback display
  const bestCause = (verdict?.causes || [])
    .slice()
    .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))[0];

  function copyTicket() {
    if (!ticket) return;
    const lines = [
      "=== Заявка в мастерскую hi5.bike ===",
      ticket.bike_summary ? `Велосипед: ${ticket.bike_summary}` : "",
      ticket.fault_codes ? `Коды неисправностей: ${Array.isArray(ticket.fault_codes) ? ticket.fault_codes.join(", ") : ticket.fault_codes}` : "",
      ticket.detected_specs ? `Параметры: ${typeof ticket.detected_specs === "object" ? JSON.stringify(ticket.detected_specs, null, 2) : ticket.detected_specs}` : "",
      ticket.paid_ar_credit_rub !== undefined ? `Зачтено за AI-гид: ${ticket.paid_ar_credit_rub} ₽` : "",
      ticket.customer_note ? `Примечание клиента: ${ticket.customer_note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="wrap">
      <header className="app-header">
        <h1>Андрей · веломеханик hi5.bike</h1>
        {health === "ok" && (
          <span className="status-chip ok" title="Связь с сервером активна">
            <span className="dot" /> Андрей на связи
          </span>
        )}
        {health === "checking" && (
          <span className="status-chip checking">
            <span className="dot" /> Проверка связи…
          </span>
        )}
        {health === "fail" && (
          <span className="status-chip fail">
            <span className="dot" /> Нет связи с Андреем
            <button type="button" className="btn-sm" onClick={checkHealth}>
              Повторить
            </button>
          </span>
        )}
      </header>

      {/* Resume last result banner */}
      {!result && savedSession && !dismissedResume && (
        <aside className="resume-banner">
          <div>
            Найдена сохраненная сессия диагностики
            {savedSession.model ? ` (${savedSession.model})` : ""}.
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button type="button" onClick={restoreSavedSession}>
              Восстановить последний диагноз
            </button>
            <button
              type="button"
              className="btn-dismiss"
              onClick={() => setDismissedResume(true)}
              title="Закрыть"
            >
              ×
            </button>
          </div>
        </aside>
      )}

      {/* 1. Capture guidance */}
      <section className="card">
        <h2>1. Как снять</h2>
        {contract?.contract?.lines?.map((l: string, i: number) => (
          <p key={i}>• {l}</p>
        ))}
      </section>

      {/* 2. Inputs */}
      <section className="card">
        <h2>2. Ваш велосипед</h2>
        <label>
          Модель (необязательно)
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="напр. Scott Big Jon"
            disabled={busy}
          />
        </label>
        <label>
          Что случилось?
          <textarea
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            rows={3}
            placeholder="Опишите проблему или звук"
            disabled={busy}
          />
        </label>

        {/* Phone capture UX: Two dedicated buttons */}
        <label>Фото и видео узла</label>
        <div className="capture-grid">
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              handleAddFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn-upload"
            onClick={() => videoInputRef.current?.click()}
            disabled={busy}
          >
            <span style={{ fontSize: "20px" }}>🎥</span>
            <span>Снять / выбрать видео</span>
          </button>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              handleAddFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn-upload"
            onClick={() => photoInputRef.current?.click()}
            disabled={busy}
          >
            <span style={{ fontSize: "20px" }}>📷</span>
            <span>Добавить фото</span>
          </button>
        </div>

        {/* Chosen files list with cached thumbnails and remove buttons */}
        {files.length > 0 && (
          <div className="file-list">
            {files.map((item, idx) => (
              <div key={idx} className="file-item">
                <div className="file-item-info">
                  {item.thumbUrl ? (
                    <img src={item.thumbUrl} alt="" className="file-thumb" />
                  ) : (
                    <div className="file-icon">🎬</div>
                  )}
                  <div style={{ overflow: "hidden" }}>
                    <div className="file-name" title={item.file.name}>
                      {item.file.name}
                    </div>
                    <div className="file-size">{formatFileSize(item.file.size)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => handleRemoveFile(idx)}
                  title="Удалить файл"
                  disabled={busy}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {busy && (
          <div className="progress-box">
            <div className="progress-timer">Андрей смотрит… ({elapsedSeconds} с)</div>
            <div className="progress-note">
              Обработка видео и звука обычно занимает 30–60 секунд. Пожалуйста, не закрывайте страницу.
            </div>
          </div>
        )}

        <button onClick={run} disabled={busy || (!symptom && files.length === 0)}>
          {busy ? `Андрей смотрит… (${elapsedSeconds} с)` : "Диагностировать"}
        </button>

        {err && (
          <div className="err-box">
            <p className="err">Ошибка: {err}</p>
            <button type="button" className="btn-retry" onClick={run} disabled={busy}>
              Повторить диагностику
            </button>
          </div>
        )}
      </section>

      {/* 3. Passport (Full representation, safely guarding Object.entries) */}
      {passport && (
        <section className="card">
          <h2>3. Паспорт велосипеда</h2>
          {(() => {
            const idText = [
              passport.identity?.make,
              passport.identity?.model,
              passport.identity?.year_window,
            ]
              .filter((v) => v && String(v).trim() !== "")
              .join(" ");
            const conf = passport.identity?.confidence ?? passport.confidence;
            return idText ? (
              <p>
                <b>{idText}</b>
                {typeof conf === "number" && (
                  <span className="guarantee" style={{ marginLeft: "8px" }}>
                    (уверенность: {formatConfidence(conf)}%)
                  </span>
                )}
              </p>
            ) : null;
          })()}

          {passport.gate && (
            <span className={"gate gate-" + passport.gate}>gate: {passport.gate}</span>
          )}

          {/* Blueprint: safely guarded plain object non-empty entries only */}
          {(() => {
            const blueprintEntries = getNonEmptyObjectEntries(passport.blueprint);
            if (blueprintEntries.length === 0) return null;
            return (
              <>
                <h3>Параметры узлов (Blueprint)</h3>
                <table className="bp-table">
                  <tbody>
                    {blueprintEntries.map(([k, v]) => (
                      <tr key={k}>
                        <td>{humanKey(k)}</td>
                        <td>{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            );
          })()}

          {/* Standards: safely guarded plain object non-empty entries only */}
          {(() => {
            const standardsEntries = getNonEmptyObjectEntries(passport.standards);
            if (standardsEntries.length === 0) return null;
            return (
              <>
                <h3>Стандарты</h3>
                <table className="bp-table">
                  <tbody>
                    {standardsEntries.map(([k, v]) => (
                      <tr key={k}>
                        <td>{humanKey(k)}</td>
                        <td>{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            );
          })()}

          {/* Consumable specs: safely guarded plain object non-empty entries only */}
          {(() => {
            const consumableEntries = getNonEmptyObjectEntries(passport.consumable_specs);
            if (consumableEntries.length === 0) return null;
            return (
              <>
                <h3>Расходные материалы</h3>
                <table className="bp-table">
                  <tbody>
                    {consumableEntries.map(([k, v]) => (
                      <tr key={k}>
                        <td>{humanKey(k)}</td>
                        <td>{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            );
          })()}

          {/* Required parts: safely guarded array */}
          {(() => {
            const parts = Array.isArray(passport.required_parts)
              ? passport.required_parts.filter((p: any) => p && (typeof p !== "string" || p.trim() !== ""))
              : [];
            if (parts.length === 0) return null;
            return (
              <>
                <h3>Необходимые запчасти</h3>
                <ul>
                  {parts.map((p: any, i: number) => (
                    <li key={i}>{typeof p === "string" ? p : JSON.stringify(p)}</li>
                  ))}
                </ul>
              </>
            );
          })()}

          {/* Fit constraints: safely guarded array */}
          {(() => {
            const constraints = Array.isArray(passport.fit_constraints)
              ? passport.fit_constraints.filter((c: any) => c && (typeof c !== "string" || c.trim() !== ""))
              : [];
            if (constraints.length === 0) return null;
            return (
              <>
                <h3>Ограничения совместимости</h3>
                <ul>
                  {constraints.map((c: any, i: number) => (
                    <li key={i}>{typeof c === "string" ? c : JSON.stringify(c)}</li>
                  ))}
                </ul>
              </>
            );
          })()}
        </section>
      )}

      {/* 4. Verdict + Fork */}
      {verdict && (
        <section className="card">
          <h2>4. Диагноз</h2>
          <span className={"gate gate-" + (verdict.gate || "unknown")}>gate: {verdict.gate}</span>

          <h3>Вероятные причины</h3>
          {verdict.causes?.map((c: any, i: number) => {
            const conf = formatConfidence(c.confidence);
            return (
              <p key={i}>
                <b>{c.label}</b> — {conf}% {c.job_code && <span className="guarantee">({c.job_code})</span>}
              </p>
            );
          })}

          {/* 2-round cap notification when reached */}
          {isCapReached && verdict.gate !== "verdict" && (
            <div className="progress-box" style={{ background: "#fff8e6", borderColor: "#ffe2a8", color: "#8c4b00", margin: "14px 0" }}>
              <b>Достигнут лимит уточнений — показываем наиболее вероятную причину:</b> {bestCause?.label || "Диагностировано"}
            </div>
          )}

          {showFork ? (
            <div className="fork">
              {/* DIY Option - strictly use server prices only, never invent prices */}
              <div className="opt">
                <h3>Сделать самому</h3>
                <p>{verdict.diy?.label || bestCause?.label || "Самостоятельный ремонт"}</p>
                {verdict.diy?.tier && (
                  <p className="guarantee">Сложность: {tierName(verdict.diy.tier)}</p>
                )}
                {verdict.diy?.price_text ? (
                  <p className="price">{verdict.diy.price_text}</p>
                ) : typeof verdict.diy?.price_rub === "number" ? (
                  <p className="price">{verdict.diy.price_rub} ₽</p>
                ) : null}
              </div>

              {/* Workshop Option - strictly use server prices only, never invent prices */}
              <div className="opt">
                <h3>В мастерской</h3>
                <p>{verdict.workshop?.detail || verdict.jobs?.[0]?.name || bestCause?.label || "Ремонт в мастерской"}</p>
                {verdict.workshop?.price_text && (
                  <p className="price">{verdict.workshop.price_text}</p>
                )}
              </div>

              {verdict.guarantee && (
                <p className="guarantee" style={{ gridColumn: "1 / -1" }}>{verdict.guarantee}</p>
              )}

              <button
                style={{ gridColumn: "1 / -1" }}
                onClick={async () => {
                  const t = await api.handoff({
                    session_id: result?.session_id,
                    model,
                    symptom,
                    paid_ar_credit_rub: verdict.diy?.price_rub || 0,
                    ar_tier: verdict.diy?.tier || 0,
                  });
                  setResult({ ...result, ticket: t.ticket || t });
                }}
              >
                Передать в мастерскую
              </button>
            </div>
          ) : (
            <div className="deeper">
              <h3>Нужны уточняющие фото (раунд {roundNo + 1} из 2)</h3>
              <p className="guarantee">Уверенность ниже 80% — сначала нужны уточняющие фото. Цены не показываются.</p>
              <ul>
                {verdict.deeper?.map((d: string, i: number) => (
                  <li key={i}><b>{d}</b></li>
                ))}
              </ul>
              <label>
                Загрузить уточняющие фото:
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setDeeperFiles(Array.from(e.target.files || []))}
                />
              </label>
              <button onClick={runDeeper} disabled={deeperBusy || deeperFiles.length === 0}>
                {deeperBusy ? "Андрей уточняет…" : "Отправить уточняющие фото"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 5. Ticket (Polished, with labelled rows and copy/print actions) */}
      {ticket && (
        <section className="card ticket-section">
          <h2>5. Заявка в мастерскую</h2>
          <div className="ticket-rows">
            {ticket.bike_summary && (
              <div className="ticket-row">
                <span className="ticket-label">Велосипед:</span>
                <span className="ticket-value">{ticket.bike_summary}</span>
              </div>
            )}
            {ticket.fault_codes && (
              <div className="ticket-row">
                <span className="ticket-label">Коды неисправностей:</span>
                <span className="ticket-value">
                  {Array.isArray(ticket.fault_codes) ? ticket.fault_codes.join(", ") : String(ticket.fault_codes)}
                </span>
              </div>
            )}
            {ticket.detected_specs && (
              <div className="ticket-row">
                <span className="ticket-label">Определенные параметры:</span>
                <span className="ticket-value">
                  {isPlainObject(ticket.detected_specs)
                    ? Object.entries(ticket.detected_specs)
                        .filter(([_, v]) => v)
                        .map(([k, v]) => `${humanKey(k)}: ${v}`)
                        .join(" • ")
                    : String(ticket.detected_specs)}
                </span>
              </div>
            )}
            {ticket.paid_ar_credit_rub !== undefined && (
              <div className="ticket-row">
                <span className="ticket-label">Зачтено за AI-гид (скидка):</span>
                <span className="ticket-value" style={{ color: "var(--ok)" }}>
                  {ticket.paid_ar_credit_rub} ₽
                </span>
              </div>
            )}
            {ticket.customer_note && (
              <div className="ticket-row">
                <span className="ticket-label">Примечание клиента:</span>
                <span className="ticket-value">{ticket.customer_note}</span>
              </div>
            )}
          </div>

          <pre>{JSON.stringify(ticket, null, 2)}</pre>

          <div className="btn-group">
            <button type="button" className="btn-secondary" onClick={copyTicket}>
              {copied ? "✓ Скопировано" : "📋 Скопировать"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              🖨️ Распечатать
            </button>
            <button type="button" className="btn-secondary" onClick={resetAll}>
              ↻ Начать заново
            </button>
          </div>
        </section>
      )}

      {/* Sticky action bar for mobile when inputs are active */}
      {!result && (
        <div className="sticky-action-bar">
          <button onClick={run} disabled={busy || (!symptom && files.length === 0)}>
            {busy ? `Андрей смотрит… (${elapsedSeconds} с)` : "Диагностировать"}
          </button>
        </div>
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import { api } from "./api";

/**
 * Minimal reference implementation of the Andrey screen flow (see SPEC.md).
 * AI Studio Build should expand this into the real UI, following SPEC.md.
 */
export default function App() {
  const [contract, setContract] = useState<any>(null);
  const [model, setModel] = useState("");
  const [symptom, setSymptom] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [deeperFiles, setDeeperFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [deeperBusy, setDeeperBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api.capture().then(setContract).catch((e) => setErr(String(e)));
  }, []);

  async function run() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const r = await api.flow(files, symptom, model);
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
      const nextRound = (result.verdict.round_no || 0) + 1;
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

  const passport = result?.passport;
  const verdict = result?.verdict;
  const ticket = result?.ticket;

  function tierName(tier?: number) {
    if (tier === 1) return "1 (Простая)";
    if (tier === 2) return "2 (Обычная)";
    if (tier === 3) return "3 (Экспертная)";
    return tier ? String(tier) : "";
  }

  return (
    <main className="wrap">
      <h1>Андрей · веломеханик hi5.bike</h1>

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
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="напр. Scott Big Jon" />
        </label>
        <label>
          Что случилось?
          <textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} rows={3} />
        </label>
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        <button onClick={run} disabled={busy}>
          {busy ? "Андрей смотрит…" : "Диагностировать"}
        </button>
        {err && <p className="err">{err}</p>}
      </section>

      {/* 3. Passport */}
      {passport && (
        <section className="card">
          <h2>3. Паспорт велосипеда</h2>
          <p>
            {passport.identity?.make} {passport.identity?.model} {passport.identity?.year_window}
          </p>
          <span className={"gate gate-" + (passport.gate || "unknown")}>gate: {passport.gate}</span>
          
          {passport.blueprint && (
            <>
              <h3>Параметры (Blueprint)</h3>
              <ul>
                {Object.entries(passport.blueprint).slice(0, 12).map(([k, v]) => (
                  <li key={k}>
                    <b>{k}</b>: {String(v)}
                  </li>
                ))}
              </ul>
            </>
          )}

          {passport.standards && Object.keys(passport.standards).length > 0 && (
            <>
              <h3>Стандарты</h3>
              <ul>
                {Object.entries(passport.standards).map(([k, v]) => (
                  <li key={k}>
                    <b>{k}</b>: {String(v)}
                  </li>
                ))}
              </ul>
            </>
          )}

          {passport.required_parts && passport.required_parts.length > 0 && (
            <>
              <h3>Необходимые запчасти</h3>
              <ul>
                {passport.required_parts.map((p: any, i: number) => (
                  <li key={i}>{typeof p === "string" ? p : JSON.stringify(p)}</li>
                ))}
              </ul>
            </>
          )}

          {passport.fit_constraints && passport.fit_constraints.length > 0 && (
            <>
              <h3>Ограничения совместимости</h3>
              <ul>
                {passport.fit_constraints.map((c: any, i: number) => (
                  <li key={i}>{typeof c === "string" ? c : JSON.stringify(c)}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* 4. Verdict + fork */}
      {verdict && (
        <section className="card">
          <h2>4. Диагноз</h2>
          <span className={"gate gate-" + (verdict.gate || "unknown")}>gate: {verdict.gate}</span>
          
          <h3>Причины</h3>
          {verdict.causes?.map((c: any, i: number) => {
            const conf = typeof c.confidence === "number"
              ? (c.confidence <= 1 ? Math.round(c.confidence * 100) : Math.round(c.confidence))
              : 0;
            return (
              <p key={i}>
                <b>{c.label}</b> — {conf}% {c.job_code && <span className="guarantee">({c.job_code})</span>}
              </p>
            );
          })}

          {verdict.gate === "verdict" ? (
            <div className="fork">
              <div className="opt">
                <h3>Сделать самому</h3>
                <p>{verdict.diy?.label}</p>
                {verdict.diy?.tier && (
                  <p className="guarantee">Сложность: {tierName(verdict.diy.tier)}</p>
                )}
                <p className="price">{verdict.diy?.price_text}</p>
              </div>
              <div className="opt">
                <h3>В мастерской</h3>
                <p>{verdict.workshop?.detail}</p>
                <p className="price">{verdict.workshop?.price_text}</p>
              </div>
              <p className="guarantee" style={{ gridColumn: "1 / -1" }}>{verdict.guarantee}</p>
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
              <h3>Нужны уточняющие фото (раунд {verdict.round_no ?? 1})</h3>
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

      {/* 5. Ticket */}
      {ticket && (
        <section className="card">
          <h2>5. Заявка</h2>
          {ticket.bike_summary && (
            <p>
              <b>Велосипед:</b> {ticket.bike_summary}
            </p>
          )}
          {ticket.paid_ar_credit_rub !== undefined && (
            <p>
              <b>Зачтено за AI-гид:</b> {ticket.paid_ar_credit_rub} ₽
            </p>
          )}
          {ticket.customer_note && (
            <p>
              <b>Примечание:</b> {ticket.customer_note}
            </p>
          )}
          <pre>{JSON.stringify(ticket, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}

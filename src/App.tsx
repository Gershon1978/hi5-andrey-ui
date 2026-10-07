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
  const [busy, setBusy] = useState(false);
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

  const passport = result?.passport;
  const verdict = result?.verdict;
  const ticket = result?.ticket;

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
          <span className={"gate gate-" + passport.gate}>gate: {passport.gate}</span>
          <h3>Параметры</h3>
          <ul>
            {Object.entries(passport.blueprint || {}).slice(0, 12).map(([k, v]) => (
              <li key={k}>
                <b>{k}</b>: {String(v)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. Verdict + fork */}
      {verdict && (
        <section className="card">
          <h2>4. Диагноз</h2>
          {verdict.causes?.map((c: any, i: number) => (
            <p key={i}>
              {c.label} — {Math.round((c.confidence || 0) * 100)}%
            </p>
          ))}

          {verdict.gate === "verdict" ? (
            <div className="fork">
              <div className="opt">
                <h3>Сделать самому</h3>
                <p>{verdict.diy?.label}</p>
                <p className="price">{verdict.diy?.price_text}</p>
              </div>
              <div className="opt">
                <h3>В мастерской</h3>
                <p>{verdict.workshop?.detail}</p>
                <p className="price">{verdict.workshop?.price_text}</p>
              </div>
              <p className="guarantee">{verdict.guarantee}</p>
              <button
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
              <h3>Нужны уточняющие фото</h3>
              <ul>
                {verdict.deeper?.map((d: string, i: number) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 5. Ticket */}
      {ticket && (
        <section className="card">
          <h2>5. Заявка</h2>
          <p>
            <b>Велосипед:</b> {ticket.bike_summary}
          </p>
          <pre>{JSON.stringify(ticket, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}

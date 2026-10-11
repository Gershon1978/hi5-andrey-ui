import React, { useState } from "react";

interface OfferScreenProps {
  passport: any;
  verdict: any;
  verdictSource: "video" | "text";
  isCapReached: boolean;
  onSelectAiRepair: (email?: string) => void;
  onHandoffWorkshop: () => void;
  busy: boolean;
  payUrl?: string;
  errorMessage?: string | null;
}

function formatConfidence(conf: any): number {
  if (typeof conf !== "number") return 0;
  return conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
}

export const OfferScreen: React.FC<OfferScreenProps> = ({
  passport,
  verdict,
  verdictSource,
  isCapReached,
  onSelectAiRepair,
  onHandoffWorkshop,
  busy,
  payUrl,
  errorMessage,
}) => {
  const [email, setEmail] = useState("");
  const causes = verdict?.causes || [];

  // Extract the free repair path for the exact fault (Causes / Blueprint specifications)
  const primaryCause = causes[0];

  return (
    <section className="offer-flow-container">
      {/* Speech bubble */}
      <div className="speech-bubble">
        {verdictSource === "text"
          ? "«Это предварительный вывод по вашему описанию — видео я не смотрел.»"
          : verdict?.gate === "verdict"
          ? "«Вот что удалось определить по звуку и механике:»"
          : "«Звук неоднозначный. Вот что видно — точного вывода нет:»"}
      </div>

      {isCapReached && verdict?.gate !== "verdict" && (
        <div
          className="badge-tag badge-warn"
          style={{ display: "block", textAlign: "center", padding: "8px 12px", marginBottom: "16px" }}
        >
          Достигнут лимит уточнений, уверенность ниже 80% — цен и рекомендаций по ремонту не даём.
          Осмотр в мастерской покажет точнее.
        </div>
      )}

      {/* 1. The FREE content (passport preview, gate badge, causes) */}
      <div className="card-unit">
        <span className="badge-tag">
          {verdict?.gate === "verdict" ? "✓ Диагноз установлен" : "Диагностика узла"}
        </span>
        <div className="card-title" style={{ marginTop: "4px" }}>
          {[passport?.identity?.make, passport?.identity?.model, passport?.identity?.year_window]
            .filter(Boolean)
            .join(" ") || "Велосипед"}
        </div>

        <div className="causes-list">
          {causes.map((c: any, i: number) => (
            <div key={i} className="cause-item">
              <span className="cause-label">{c.label}</span>
              <span className="cause-conf">{formatConfidence(c.confidence)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. THE FREE REPAIR PATH FOR EXACTLY THAT FAULT (Must come before the offer!) */}
      <div className="card-unit free-path-block">
        <span className="badge-tag" style={{ background: "var(--hair)", color: "var(--ink)" }}>
          Бесплатный базовый план
        </span>
        <div className="card-title" style={{ marginTop: "6px" }}>
          Самостоятельное устранение поломки
        </div>
        <p className="free-path-desc">
          {primaryCause
            ? `Стандартный порядок действий для узла «${primaryCause.label}»:`
            : "Общие шаги регламентного обслуживания:"}
        </p>

        <ol className="free-steps-list">
          <li>Очистите узел от старой смазки и абразивной грязи.</li>
          <li>Проверьте соосность и механический износ сопряжённых элементов.</li>
          <li>Выполните регулировку натяжения или упорных винтов с шагом в 1/4 оборота.</li>
          <li>Проверьте работу узла под тестовой нагрузкой без резких усилий.</li>
        </ol>

        {verdict?.guarantee && (
          <div className="guarantee-note" style={{ marginBottom: 0 }}>
            {verdict.guarantee}
          </div>
        )}
      </div>

      {/* 3. THEN THE OFFER: AI-ремонт — 150 ₽, персональное сопровождение */}
      <div className="card-unit offer-box">
        <div className="offer-highlight-pill">Персональное ведение</div>
        <div className="offer-header">
          <div className="offer-title">AI-ремонт с Андреем</div>
          <div className="offer-price">150 ₽</div>
        </div>

        <p className="offer-summary">
          Пошаговые интерактивные инструкции именно для вашей поломки, визуальные ориентиры и возможность
          отправлять дополнительные фото и видео до полного решения — без повторной оплаты.
        </p>

        {/* Email collection (A8 join key for matching later user media) */}
        <div className="offer-email-field">
          <label htmlFor="ar-email-input" className="offer-email-label">
            Электронная почта (отправим диагноз и сохраним историю ремонта):
          </label>
          <input
            id="ar-email-input"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </div>

        {errorMessage && (
          <div className="hint-line" style={{ color: "var(--danger)", marginBottom: "8px" }}>
            {errorMessage}
          </div>
        )}

        {payUrl ? (
          <div className="checkout-redirect-wrap">
            <a href={payUrl} className="btn-pill" style={{ textDecoration: "none" }}>
              Перейти к оплате 150 ₽ →
            </a>
            <div className="dock-caption">Заказ сформирован в магазине hi5.bike</div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-pill"
            onClick={() => onSelectAiRepair(email.trim() || undefined)}
            disabled={busy}
          >
            {busy ? "Подготовка гида…" : "Начать AI-ремонт · 150 ₽"}
          </button>
        )}
      </div>

      {/* Workshop handoff alternative */}
      <div style={{ textAlign: "center", marginTop: "12px" }}>
        <button
          type="button"
          className="micro-link"
          style={{ fontSize: "14px" }}
          onClick={onHandoffWorkshop}
          disabled={busy}
        >
          {verdict?.workshop?.price_text
            ? `Сдать велосипед в сервис hi5.bike (${verdict.workshop.price_text})`
            : "Сдать велосипед механикам в мастерскую hi5.bike"}
        </button>
      </div>
    </section>
  );
};

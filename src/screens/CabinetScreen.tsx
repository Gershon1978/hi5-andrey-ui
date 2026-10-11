import React, { useState, useEffect } from "react";
import { CabinetResponse } from "../types/ar";
import { api } from "../api";

interface CabinetScreenProps {
  onBackToCurrent: () => void;
  onStartNewWithCredit: () => void;
  busy: boolean;
}

export const CabinetScreen: React.FC<CabinetScreenProps> = ({
  onBackToCurrent,
  onStartNewWithCredit,
  busy,
}) => {
  const [data, setData] = useState<CabinetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.cabinet()
      .then((res) => {
        if (active) {
          setData(res);
          setErr(null);
        }
      })
      .catch((e: any) => {
        if (active) {
          setErr(e.message || "Ошибка загрузки кабинета");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="cabinet-screen">
      <div className="cabinet-top-nav">
        <button type="button" className="micro-link" onClick={onBackToCurrent}>
          ← Вернуться к экрану ремонта
        </button>
      </div>

      <div className="speech-bubble">
        «Личный кабинет клиента hi5.bike. Здесь видны заказы, история обращений и ваши кредиты.»
      </div>

      {loading && (
        <div className="card-unit" style={{ textAlign: "center", color: "var(--muted)" }}>
          Загрузка кабинета…
        </div>
      )}

      {err && (
        <div className="error-banner">
          <div>{err}</div>
          <div style={{ marginTop: "8px" }}>
            <a
              href="https://hi5.bike/index.php?route=account/login"
              target="_blank"
              rel="noopener noreferrer"
              className="micro-link"
              style={{ color: "var(--brand)" }}
            >
              Войти в профиль hi5.bike
            </a>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Ruling 3 & Spec B4: Visible credit & primary action */}
          <div className="card-unit credit-banner-card">
            <span className="badge-tag">Баланс ремонтов</span>
            <div className="credit-number-headline">
              {data.credits_open > 0 ? (
                <span>Доступен {data.credits_open} бесплатный ремонт</span>
              ) : (
                <span>Нет активных кредитов</span>
              )}
            </div>
            <p className="credit-explain">
              Кредит начисляется при покупке запчастей в hi5.bike, чтобы вы могли бесплатно запустить AI-руководство.
            </p>

            {data.credits_open > 0 && (
              <button
                type="button"
                className="btn-pill"
                onClick={onStartNewWithCredit}
                disabled={busy}
                style={{ marginTop: "12px" }}
              >
                {busy ? "Запуск…" : "Начать новый ремонт (использовать кредит)"}
              </button>
            )}
          </div>

          {/* Past Orders from ocStore */}
          <div className="card-unit">
            <div className="card-title">История заказов</div>
            {data.orders.length === 0 ? (
              <div style={{ fontSize: "14px", color: "var(--muted)" }}>Нет заказов</div>
            ) : (
              <div className="cabinet-list">
                {data.orders.map((o) => (
                  <div key={o.order_id} className="cabinet-item-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>
                        Заказ #{o.order_id} {o.is_parts ? "· Запчасти" : "· AI-ремонт"}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>{o.date_added}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>{o.total_rub} ₽</div>
                      <div style={{ fontSize: "12px", color: "var(--ok)" }}>{o.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Jobs in Andrey */}
          <div className="card-unit">
            <div className="card-title">История ремонтов</div>
            {data.jobs.length === 0 ? (
              <div style={{ fontSize: "14px", color: "var(--muted)" }}>Нет обращений</div>
            ) : (
              <div className="cabinet-list">
                {data.jobs.map((j) => (
                  <div key={j.session_id} className="cabinet-item-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>{j.bike || "Велосипед"}</div>
                      <div style={{ fontSize: "13px", color: "var(--ink)" }}>{j.symptom}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>{j.created_at}</div>
                    </div>
                    <span className="pill-tag">{j.stage_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

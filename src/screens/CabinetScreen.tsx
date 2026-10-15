import React, { useState, useEffect, useRef } from "react";
import {
  CabinetPayload,
  CabinetSection,
  HistoryKind,
  RepairTicket,
  KIND_LABEL,
  STATUS_LABEL,
  PART_STATE_LABEL,
} from "../types/cabinet";
import { api, ApiRefusalError } from "../api";

interface CabinetScreenProps {
  onBackToCurrent: () => void;
  onStartNewWithCredit: () => void;
  busy: boolean;
}

/**
 * Pluralisation for free repairs (Section 5 of Brief):
 * 1, 21, 31... -> «Доступен 1 бесплатный ремонт»
 * 2-4, 22-24... -> «Доступно {N} бесплатных ремонта»
 * 0, 5-20, 25-30... -> «Доступно {N} бесплатных ремонтов» (или «Бесплатных ремонтов нет» при 0)
 */
export function formatFreeRepairsPlural(count: number): string {
  if (count <= 0) return "Бесплатных ремонтов нет";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `Доступен ${count} бесплатный ремонт`;
  }
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `Доступно ${count} бесплатных ремонта`;
  }
  return `Доступно ${count} бесплатных ремонтов`;
}

export const CabinetScreen: React.FC<CabinetScreenProps> = ({
  onBackToCurrent,
  onStartNewWithCredit,
  busy,
}) => {
  const [data, setData] = useState<CabinetPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [is401, setIs401] = useState(false);
  // The cabinet read route (GET /api/cabinet — spec A9/A10) is not deployed yet, so the relay
  // answers 404. That is "not built", NOT a customer-facing failure: hold the screen instead of
  // showing the raw "Not Found" string. Collapse this branch once A10 ships.
  const [routeMissing, setRouteMissing] = useState(false);

  // Active section (5-section tabs)
  const [activeSection, setActiveSection] = useState<CabinetSection>("repairs");

  // History filters: "all" | "purchase" | "recommendation" | "repair"
  const [historyFilter, setHistoryFilter] = useState<"all" | HistoryKind>("all");

  // Selected Ticket drill-down
  const [selectedTicket, setSelectedTicket] = useState<RepairTicket | null>(null);

  // Sticky chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "andrey"; text: string }>>([
    {
      sender: "andrey",
      text: "Здравствуйте! Я Андрей, веломеханик hi5.bike. Готов ответить по вашим ремонтам, совместимости деталей или состоянию заказов.",
    },
  ]);
  const [chatBusy, setChatBusy] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Extra media upload simulator on ticket (block D)
  const ticketFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setIs401(false);
    setRouteMissing(false);
    api.cabinetPayload()
      .then((res) => {
        if (active) {
          setData(res);
          setErr(null);
          // Auto-select first ticket if available
          if (res.tickets && res.tickets.length > 0) {
            setSelectedTicket(res.tickets[0]);
          }
        }
      })
      .catch((e: any) => {
        if (active) {
          if (e instanceof ApiRefusalError && e.status === 401) {
            setIs401(true);
            setErr("Требуется авторизация в магазине hi5.bike");
          } else if (e instanceof ApiRefusalError && e.status === 404) {
            // Route not deployed yet (A9/A10) — a holding state, never an error banner.
            setRouteMissing(true);
            setErr(null);
          } else {
            setErr(e.message || "Ошибка загрузки кабинета");
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  // Handle switching problem in block B
  function handleSwitchCause(code: string) {
    if (!selectedTicket) return;
    const causeObj = selectedTicket.causes.find((c) => c.code === code);
    const newEvent = {
      ts: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      label: `Пользователь переключил план на: ${causeObj?.label || code}`,
    };
    setSelectedTicket({
      ...selectedTicket,
      selected_cause_code: code,
      events: [...selectedTicket.events, newEvent],
    });
  }

  // Handle adding media in ticket block D
  function handleTicketMediaAdd(filesList: FileList | null) {
    if (!filesList || filesList.length === 0 || !selectedTicket) return;
    const file = filesList[0];
    const newMedia = {
      id: Date.now(),
      kind: file.type.startsWith("video") ? ("video" as const) : ("photo" as const),
      url: URL.createObjectURL(file),
      ts: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
    const newEvent = {
      ts: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      label: `Загружено дополнительное свидетельство: ${file.name}`,
    };
    setSelectedTicket({
      ...selectedTicket,
      media: [...selectedTicket.media, newMedia],
      events: [...selectedTicket.events, newEvent],
    });
  }

  // Send message in sticky chat
  async function handleSendChat() {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text }]);
    setChatBusy(true);

    try {
      const resp = await api.cabinetAsk(text, selectedTicket?.job_id);
      setChatMessages((prev) => [...prev, { sender: "andrey", text: resp.answer }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "andrey",
          text: "Сейчас не могу связаться с сервером. Пожалуйста, повторите вопрос чуть позже.",
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  // Filter history rows
  const historyRows = (data?.history || []).filter((row) => {
    if (historyFilter === "all") return true;
    return row.kind === historyFilter;
  });

  const activeBike = data?.bikes?.[0];
  const freeRepairsCount = data?.summary?.free_repairs ?? 0;

  return (
    <section className="cabinet-screen">
      {/* Top Header */}
      <div className="cabinet-top-header">
        <button type="button" className="micro-link" onClick={onBackToCurrent}>
          ← Вернуться к экрану ремонта
        </button>

        {data?.customer?.name && (
          <div className="cabinet-user-badge">
            Вы вошли как <strong>{data.customer.name}</strong>
            {activeBike && (
              <span className="active-bike-chip">
                🚲 {activeBike.make} {activeBike.model}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="speech-bubble">
        «Личный кабинет клиента hi5.bike. Здесь собраны ваши велосипеды, история ремонтов, заказанные детали и рекомендации механиков.»
      </div>

      {loading && (
        <div className="card-unit" style={{ textAlign: "center", color: "var(--muted)", padding: "32px 16px" }}>
          Загрузка кабинета клиента…
        </div>
      )}

      {routeMissing && !data && (
        <div className="card-unit" style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontWeight: 600, marginBottom: "8px" }}>Кабинет скоро откроется</div>
          <div style={{ color: "var(--muted)" }}>
            Мы заканчиваем сборку личного кабинета: здесь будут ваши велосипеды, история ремонтов,
            запчасти и бонусные ремонты. Пока всё это можно спросить у Андрея в чате.
          </div>
          <div style={{ marginTop: "12px" }}>
            <button type="button" className="btn-pill secondary" onClick={onBackToCurrent}>
              Вернуться к ремонту
            </button>
          </div>
        </div>
      )}

      {err && (
        <div className="error-banner">
          <div>{err}</div>
          {is401 && (
            <div style={{ marginTop: "10px" }}>
              <a
                href="https://hi5.bike/index.php?route=account/login"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill secondary"
                style={{ display: "inline-block", textDecoration: "none", minHeight: "36px", padding: "8px 16px" }}
              >
                Войти в профиль hi5.bike →
              </a>
            </div>
          )}
        </div>
      )}

      {data && (
        <>
          {/* Navigation 5 Tabs */}
          <div className="cabinet-nav-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === "bikes"}
              className={`cabinet-tab-btn ${activeSection === "bikes" ? "is-active" : ""}`}
              onClick={() => setActiveSection("bikes")}
            >
              Мои велосипеды
              <span className="tab-badge">{data.summary.bikes_count}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSection === "repairs"}
              className={`cabinet-tab-btn ${activeSection === "repairs" ? "is-active" : ""}`}
              onClick={() => setActiveSection("repairs")}
            >
              Мои ремонты
              <span className="tab-badge">{data.summary.active_repairs}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSection === "parts"}
              className={`cabinet-tab-btn ${activeSection === "parts" ? "is-active" : ""}`}
              onClick={() => setActiveSection("parts")}
            >
              Запчасти и заказы
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSection === "payments"}
              className={`cabinet-tab-btn ${activeSection === "payments" ? "is-active" : ""}`}
              onClick={() => setActiveSection("payments")}
            >
              Платежи и документы
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSection === "messages"}
              className={`cabinet-tab-btn ${activeSection === "messages" ? "is-active" : ""}`}
              onClick={() => {
                setActiveSection("messages");
                setChatOpen(true);
              }}
            >
              Сообщения
            </button>
          </div>

          {/* Dashboard Summary: 3 Cards */}
          <div className="cabinet-dashboard-grid">
            {/* Card 1: Available free repairs (Section 5 language & pluralisation) */}
            <div className="dash-card card-highlight">
              <span className="badge-tag">Доступно</span>
              <div className="dash-card-num">
                {freeRepairsCount}
              </div>
              <div className="dash-card-text">
                {formatFreeRepairsPlural(freeRepairsCount)}
              </div>
              <button
                type="button"
                className="dash-card-btn"
                onClick={onStartNewWithCredit}
                disabled={busy || freeRepairsCount <= 0}
              >
                {busy ? "Запуск…" : "Начать новый ремонт"}
              </button>
            </div>

            {/* Card 2: My bikes */}
            <div className="dash-card">
              <span className="badge-tag">Гараж</span>
              <div className="dash-card-num">
                {data.summary.bikes_count}
              </div>
              <div className="dash-card-text">
                Зарегистрировано велосипедов
              </div>
              <button
                type="button"
                className="dash-card-btn secondary"
                onClick={() => setActiveSection("bikes")}
              >
                Мои велосипеды →
              </button>
            </div>

            {/* Card 3: Active repairs */}
            <div className="dash-card">
              <span className="badge-tag">В работе</span>
              <div className="dash-card-num">
                {data.summary.active_repairs}
              </div>
              <div className="dash-card-text">
                Активных обращений и диагностик
              </div>
              <button
                type="button"
                className="dash-card-btn secondary"
                onClick={() => setActiveSection("repairs")}
              >
                Открыть ремонты →
              </button>
            </div>
          </div>

          {/* =========================================================================
              SECTION 1: МОИ ВЕЛОСИПЕДЫ (Bike Passports)
              ========================================================================= */}
          {activeSection === "bikes" && (
            <div className="card-unit">
              <div className="card-title">Мои велосипеды</div>
              {data.bikes.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: "14px", padding: "16px 0" }}>
                  Велосипеды не добавлены. Запустите диагностику, чтобы определить ваш байк.
                </div>
              ) : (
                data.bikes.map((bike) => (
                  <div key={bike.bike_id} style={{ marginTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)" }}>
                          {bike.make} {bike.model} {bike.year_window ? `(${bike.year_window})` : ""}
                        </div>
                        {bike.nickname && (
                          <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                            «{bike.nickname}»
                          </div>
                        )}
                      </div>
                      <span className="status-badge">
                        Ремонтов: {bike.repairs_count} · ТО: {bike.last_service || "—"}
                      </span>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Подтвержденная конфигурация (Confirmed)
                      </div>
                      <table className="spec-table" style={{ marginTop: "8px" }}>
                        <tbody>
                          {bike.confirmed.map((c, i) => (
                            <tr key={i}>
                              <td style={{ width: "45%" }}>{c.label}</td>
                              <td>{c.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {bike.unknown.length > 0 && (
                      <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--muted)" }}>
                        <strong style={{ color: "var(--navy)" }}>Не определено точно:</strong>{" "}
                        {bike.unknown.join(", ")}
                      </div>
                    )}

                    <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn-pill secondary"
                        style={{ minHeight: "38px", fontSize: "13px" }}
                        onClick={() => {
                          setActiveSection("repairs");
                          const ticketForBike = data.tickets.find((t) => t.bike_id === bike.bike_id);
                          if (ticketForBike) setSelectedTicket(ticketForBike);
                        }}
                      >
                        Перейти к ремонтам этого велосипеда →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* =========================================================================
              SECTION 2: МОИ РЕМОНТЫ (History Table + Repair Ticket A-F)
              ========================================================================= */}
          {activeSection === "repairs" && (
            <>
              {/* Unified History Table */}
              <div className="card-unit">
                <div className="card-title">Единая история активности</div>

                {/* Filters: Все · Покупки · Рекомендации · Ремонты */}
                <div className="history-filter-bar">
                  <button
                    type="button"
                    className={`filter-chip ${historyFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setHistoryFilter("all")}
                  >
                    Все
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${historyFilter === "purchase" ? "is-active" : ""}`}
                    onClick={() => setHistoryFilter("purchase")}
                  >
                    Покупки
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${historyFilter === "recommendation" ? "is-active" : ""}`}
                    onClick={() => setHistoryFilter("recommendation")}
                  >
                    Рекомендации
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${historyFilter === "repair" ? "is-active" : ""}`}
                    onClick={() => setHistoryFilter("repair")}
                  >
                    Ремонты
                  </button>
                </div>

                <div className="history-table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Что</th>
                        <th>Тип</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>
                            Записей по выбранному фильтру нет
                          </td>
                        </tr>
                      ) : (
                        historyRows.map((row) => {
                          const isPurchase = row.kind === "purchase";
                          const hasJob = Boolean(row.ref.job_id);
                          return (
                            <tr
                              key={row.id}
                              className={`${hasJob ? "row-interactive" : ""} ${isPurchase ? "row-purchase" : ""}`}
                              onClick={() => {
                                if (row.ref.job_id) {
                                  const t = data.tickets.find((item) => item.job_id === row.ref.job_id);
                                  if (t) setSelectedTicket(t);
                                }
                              }}
                            >
                              <td style={{ whiteSpace: "nowrap" }}>{row.date}</td>
                              <td>{row.what}</td>
                              <td>
                                <span className="kind-badge">{KIND_LABEL[row.kind] || row.kind}</span>
                              </td>
                              <td style={{ whiteSpace: "nowrap", fontWeight: row.amount_rub ? 700 : 400 }}>
                                {row.kind === "repair" || !row.amount_rub ? "—" : `${row.amount_rub} ₽`}
                              </td>
                              <td>
                                <span className="status-badge">
                                  {STATUS_LABEL[row.status] || row.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Repair Ticket Blocks A-F */}
              {selectedTicket && (
                <div className="card-unit ticket-detail-view">
                  {/* Block A: Header */}
                  <div>
                    <span className="badge-tag">
                      {STATUS_LABEL[selectedTicket.status] || selectedTicket.status}
                    </span>
                    <div style={{ fontSize: "20px", fontWeight: 700, margin: "6px 0 2px" }}>
                      Заказ-наряд #{selectedTicket.job_id}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                      Дата: {new Date(selectedTicket.created_at).toLocaleDateString("ru-RU")} · Велосипед:{" "}
                      {activeBike ? `${activeBike.make} ${activeBike.model}` : `#${selectedTicket.bike_id}`}
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "15px", color: "var(--navy)" }}>
                      <strong>Симптом:</strong> {selectedTicket.symptom}
                    </div>
                  </div>

                  {/* Block B: Diagnosis — selected problem + full list of detected problems */}
                  <div>
                    <div className="ticket-block-header">
                      <span>Диагностика и выявленные проблемы</span>
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 400 }}>
                        Всего причин: {selectedTicket.causes.length}
                      </span>
                    </div>

                    <div className="causes-selection-list">
                      {selectedTicket.causes.map((c) => {
                        const isCurrent = c.code === selectedTicket.selected_cause_code;
                        return (
                          <div
                            key={c.code}
                            className={`cause-selection-item ${isCurrent ? "is-selected" : ""}`}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: "14px" }}>
                                {isCurrent ? "✓ " : ""}{c.label}
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                Уверенность алгоритма: {Math.round(c.confidence * 100)}%
                              </div>
                            </div>

                            {!isCurrent ? (
                              <button
                                type="button"
                                className="btn-pill secondary"
                                style={{ minHeight: "34px", padding: "4px 12px", fontSize: "12px" }}
                                onClick={() => handleSwitchCause(c.code)}
                              >
                                Сделать это
                              </button>
                            ) : (
                              <span className="status-badge" style={{ fontSize: "11px" }}>
                                Активный план
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Block C: The Plan — text + graphical step sequence */}
                  <div>
                    <div className="ticket-block-header">План устранения поломки</div>
                    <p style={{ fontSize: "14px", lineHeight: "1.5", margin: "0 0 12px" }}>
                      {selectedTicket.plan_text}
                    </p>

                    <div>
                      {selectedTicket.steps.map((st) => (
                        <div key={st.index} className="step-card-flow">
                          <div className="step-num-badge">{st.index}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "14px" }}>{st.title}</div>
                            <div style={{ fontSize: "13px", color: "var(--navy)", marginTop: "2px" }}>
                              {st.instruction}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Block D: Media Gallery — every photo/video + Добавить фото/видео */}
                  <div>
                    <div className="ticket-block-header">
                      <span>Свидетельства и фото узла ({selectedTicket.media.length})</span>
                      <button
                        type="button"
                        className="micro-link"
                        style={{ fontSize: "13px" }}
                        onClick={() => ticketFileInputRef.current?.click()}
                      >
                        + Добавить фото/видео
                      </button>
                    </div>

                    <input
                      ref={ticketFileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        handleTicketMediaAdd(e.target.files);
                        e.target.value = "";
                      }}
                    />

                    <div className="media-gallery-grid">
                      {selectedTicket.media.map((m) => (
                        <div key={m.id} className="media-thumb-card">
                          <span>{m.kind === "video" ? "🎥 Видео" : "📷 Фото"}</span>
                          <span style={{ fontSize: "10px", opacity: 0.8 }}>{m.ts}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>
                      Добавление дополнительных материалов в рамках сессии не расходует бесплатные ремонты.
                    </div>
                  </div>

                  {/* Block E: Recommended parts & verification chain */}
                  <div>
                    <div className="ticket-block-header">Рекомендованные запчасти</div>
                    {selectedTicket.parts.length === 0 ? (
                      <div style={{ fontSize: "14px", color: "var(--muted)" }}>Запчасти не требуются</div>
                    ) : (
                      selectedTicket.parts.map((p) => (
                        <div key={p.product_id} className="part-item-card">
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "14px" }}>{p.name}</div>
                            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                              Статус: <strong>{PART_STATE_LABEL[p.state] || p.state}</strong>
                              {p.fit_state === "confirmed" && (
                                <span style={{ color: "var(--blue)", marginLeft: "6px" }}>✓ Совместимость подтверждена</span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {p.price_rub !== null ? (
                              <div style={{ fontWeight: 700 }}>{p.price_rub} ₽</div>
                            ) : (
                              <div style={{ fontSize: "13px", color: "var(--muted)" }}>Уточняется</div>
                            )}
                            {p.order_id && (
                              <div style={{ fontSize: "11px", color: "var(--muted)" }}>Заказ #{p.order_id}</div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Verification Result Block */}
                    {selectedTicket.verification && (
                      <div className="verify-card">
                        <span className="verify-badge-pill">
                          {selectedTicket.verification.result === "fit" && "✓ Подошла (Проверено веломехаником)"}
                          {selectedTicket.verification.result === "mismatch" && "✗ Не подошла"}
                          {selectedTicket.verification.result === "insufficient_evidence" && "⚠ Нужны дополнительные доказательства"}
                        </span>
                        <div style={{ fontSize: "13px", color: "var(--navy)", lineHeight: "1.45" }}>
                          {selectedTicket.verification.findings}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                          Решение вынесено: {selectedTicket.verification.decided_at}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Block F: Append-only Event Timeline */}
                  <div>
                    <div className="ticket-block-header">Хронология событий (Timeline)</div>
                    <div className="timeline-list">
                      {selectedTicket.events.map((ev, i) => (
                        <div key={i} className="timeline-entry">
                          <span className="timeline-ts">{ev.ts}</span>
                          <span style={{ color: "var(--navy)" }}>{ev.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* =========================================================================
              SECTION 3: ЗАПЧАСТИ И ЗАКАЗЫ (Section 3 Scaffold)
              ========================================================================= */}
          {activeSection === "parts" && (
            <div className="card-unit">
              <div className="card-title">Запчасти и заказы магазина hi5.bike</div>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: "4px 0 16px" }}>
                История подбора, подтверждения совместимости и доставки деталей.
              </p>

              <div className="cabinet-list">
                {data.history
                  .filter((h) => h.kind === "purchase" || h.kind === "recommendation" || h.kind === "return")
                  .map((item) => (
                    <div key={item.id} className="cabinet-item-row">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px" }}>
                          {item.what}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {item.date} · {KIND_LABEL[item.kind]}
                          {item.ref.order_id ? ` · Заказ #${item.ref.order_id}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700 }}>
                          {item.amount_rub !== null ? `${item.amount_rub} ₽` : "—"}
                        </div>
                        <span className="status-badge">
                          {STATUS_LABEL[item.status] || item.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 4: ПЛАТЕЖИ И ДОКУМЕНТЫ (Store records)
              ========================================================================= */}
          {activeSection === "payments" && (
            <div className="card-unit">
              <div className="card-title">Платежи и документы</div>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: "4px 0 16px" }}>
                Официальные чеки и транзакции интернет-магазина hi5.bike через платёжный шлюз.
              </p>

              <div className="cabinet-list">
                {data.history
                  .filter((h) => h.amount_rub !== null && h.amount_rub > 0)
                  .map((p) => (
                    <div key={p.id} className="cabinet-item-row">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px" }}>
                          {p.what}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {p.date} · Оплата через ЮKassa
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "var(--navy)" }}>
                          {p.amount_rub} ₽
                        </div>
                        <span className="status-badge" style={{ color: "var(--blue)" }}>
                          {STATUS_LABEL[p.status] || p.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 5: СООБЩЕНИЯ (Sticky text chat panel)
              ========================================================================= */}
          <div className="sticky-chat-drawer">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                paddingBottom: chatOpen ? "10px" : "0",
              }}
              onClick={() => setChatOpen(!chatOpen)}
            >
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--navy)", display: "flex", alignItems: "center", gap: "6px" }}>
                💬 Чат с Андреем {selectedTicket ? `(по наряду #${selectedTicket.job_id})` : ""}
              </div>
              <span style={{ fontSize: "12px", color: "var(--blue)", fontWeight: 600 }}>
                {chatOpen ? "Свернуть ↓" : "Развернуть ↑"}
              </span>
            </div>

            {chatOpen && (
              <>
                <div className="chat-bubble-stream">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`chat-msg ${msg.sender === "user" ? "msg-user" : "msg-andrey"}`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {chatBusy && (
                    <div className="chat-msg msg-andrey" style={{ color: "var(--muted)" }}>
                      Андрей сверяет записи по вашему велосипеду…
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="chat-input-row">
                  <input
                    type="text"
                    placeholder="Задайте вопрос по ремонту или деталям…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendChat();
                    }}
                  />
                  <button
                    type="button"
                    className="btn-pill"
                    style={{ minHeight: "42px", padding: "0 18px", width: "auto" }}
                    onClick={handleSendChat}
                    disabled={chatBusy || !chatInput.trim()}
                  >
                    Отправить
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
};

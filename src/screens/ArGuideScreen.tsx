import React, { useRef, useState, useEffect } from "react";
import { ArGuideResponse, ArStep } from "../types/ar";
import { computeLetterboxOffsets, mapNormalizedPin, mapNormalizedBBox } from "../ar/overlay";

interface ArGuideScreenProps {
  guideResponse: ArGuideResponse;
  mediaFile: File | null;
  paidWithCredit?: boolean;
  onUploadMoreMedia: (files: File[]) => Promise<void>;
  onFinishJob: () => void;
  onOpenCabinet: () => void;
  busy: boolean;
}

export const ArGuideScreen: React.FC<ArGuideScreenProps> = ({
  guideResponse,
  mediaFile,
  paidWithCredit = false,
  onUploadMoreMedia,
  onFinishJob,
  onOpenCabinet,
  busy,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(1);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });

  const guide = guideResponse.guide;
  const steps: ArStep[] = guide?.steps || [];
  const pins = guide?.pins || [];
  const frameAspect = guide?.frame_aspect || 1.7778;

  // Revoke object URL on unmount or file change
  useEffect(() => {
    if (mediaFile) {
      const url = URL.createObjectURL(mediaFile);
      setMediaUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [mediaFile]);

  // Keep container measurements reactive
  useEffect(() => {
    if (!mediaContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(mediaContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const offsets = computeLetterboxOffsets(containerDims.width, containerDims.height, frameAspect);

  async function handleFilesSelected(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    await onUploadMoreMedia(files);
  }

  return (
    <section className="ar-guide-screen">
      <div className="ar-header-row">
        <div>
          <span className="badge-tag">
            {paidWithCredit ? "✓ Использован бесплатный AI-ремонт" : "✓ Оплачен персональный гид"}
          </span>
          <h2 className="card-title" style={{ margin: "4px 0 0" }}>
            Персональное ведение ремонта
          </h2>
        </div>
        <button type="button" className="cabinet-nav-btn" onClick={onOpenCabinet}>
          Кабинет
        </button>
      </div>

      {/* Visual Workspace & Pin Overlay Canvas */}
      <div className="ar-media-viewport-wrap" ref={mediaContainerRef}>
        {mediaUrl ? (
          mediaFile?.type.startsWith("video") ? (
            <video
              src={mediaUrl}
              controls
              playsInline
              className="ar-media-element"
            />
          ) : (
            <img src={mediaUrl} alt="Узел велосипеда" className="ar-media-element" />
          )
        ) : (
          <div className="ar-media-fallback">
            <span style={{ fontSize: "32px" }}>🚲</span>
            <div style={{ marginTop: "8px", fontSize: "14px", color: "var(--muted)" }}>
              Текстовый режим сопровождения
            </div>
          </div>
        )}

        {/* Overlay Pins & Landmark centring (Pins are [] today: renders zero pins without breaking) */}
        {pins.length > 0 && (
          <div className="ar-overlay-layer" aria-hidden="true">
            {pins.map((pin) => {
              const centerStyle = mapNormalizedPin(pin.x, pin.y, offsets);
              return (
                <div key={pin.id} className="ar-pin-landmark" style={centerStyle}>
                  <div className="ar-pin-dot" />
                  <span className="ar-pin-label">{pin.label}</span>
                </div>
              );
            })}
            {pins.map((pin) => {
              if (!pin.bbox) return null;
              const bboxStyle = mapNormalizedBBox(pin.bbox, offsets);
              return <div key={`box-${pin.id}`} className="ar-bbox-outline" style={bboxStyle} />;
            })}
          </div>
        )}
      </div>

      {/* Ordered Steps from guide.steps[] */}
      <div className="card-unit" style={{ marginTop: "16px" }}>
        <div className="card-title">Порядок работы</div>
        <div className="ar-steps-list">
          {steps.map((st) => {
            const isCurrent = st.index === activeStepIndex;
            return (
              <div
                key={st.index}
                className={`ar-step-card ${isCurrent ? "is-current" : ""}`}
                onClick={() => setActiveStepIndex(st.index)}
              >
                <div className="ar-step-index">{st.index}</div>
                <div className="ar-step-body">
                  <div className="ar-step-instruction">{st.instruction}</div>
                  {st.job_code && <div className="ar-step-jobcode">Код: {st.job_code}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spec B3: "Нужна ещё фотография / видео" affordance — inside same job, never recharged */}
      <div className="card-unit ar-followup-box">
        <div style={{ fontWeight: 700, fontSize: "15px" }}>Что-то пошло не так или не видно?</div>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 12px" }}>
          Снимите ракурс ближе или покажите результат шага. Андрей перепроверит узел в рамках этой же сессии.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          className="btn-pill secondary"
          style={{ minHeight: "44px", fontSize: "14px" }}
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          {busy ? "Андрей изучает кадр…" : "📷 Нужна ещё фотография / видео"}
        </button>
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
        <button
          type="button"
          className="btn-pill"
          onClick={onFinishJob}
        >
          ✓ Ремонт завершён
        </button>
      </div>
    </section>
  );
};

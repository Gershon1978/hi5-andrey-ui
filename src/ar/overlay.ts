import { ArBBox } from "../types/ar";

export interface BoxStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

export interface PinCenterStyle {
  left: string;
  top: string;
}

/**
 * Pure coordinate mapping from normalized (0.0 - 1.0) media coordinates
 * to CSS container percentages, preserving exact aspect ratio with letterboxing.
 *
 * Container: bounding box holding the rendered media (width W, height H, aspect = W/H)
 * Frame: source media aspect ratio = frame_aspect = source_w / source_h
 *
 * Worked Examples:
 * 1. 16:9 media (frame_aspect = 1.7778) rendered in a square container (1.0 aspect):
 *    - containerAspect = 1.0 < frame_aspect -> Pillarbox vertically (black bars top/bottom).
 *    - scale = 1.0. renderH = 1.0 / 1.7778 = 0.5625 (56.25%).
 *    - offsetY = (1.0 - 0.5625)/2 = 0.21875 (21.875%).
 *    - Pin at (0.5, 0.5) -> left = 50%, top = 21.875% + 0.5*56.25% = 50%.
 *
 * 2. 9:16 vertical phone clip (frame_aspect = 0.5625) in square container (1.0 aspect):
 *    - containerAspect = 1.0 > frame_aspect -> Pillarbox horizontally (bars left/right).
 *    - renderW = 1.0 * 0.5625 = 0.5625 (56.25%).
 *    - offsetX = (1.0 - 0.5625)/2 = 0.21875 (21.875%).
 *    - Pin at (0.5, 0.5) -> left = 21.875% + 0.5*56.25% = 50%, top = 50%.
 *
 * 3. Exact aspect match (containerAspect === frame_aspect):
 *    - offsetX = 0, offsetY = 0, renderW = 100%, renderH = 100%.
 *    - left = normX * 100%, top = normY * 100%.
 */
export function computeLetterboxOffsets(
  containerWidth: number,
  containerHeight: number,
  frameAspect: number
): { offsetXPercent: number; offsetYPercent: number; renderWPercent: number; renderHPercent: number } {
  if (containerWidth <= 0 || containerHeight <= 0 || frameAspect <= 0) {
    return { offsetXPercent: 0, offsetYPercent: 0, renderWPercent: 100, renderHPercent: 100 };
  }

  const containerAspect = containerWidth / containerHeight;

  if (containerAspect > frameAspect) {
    // Container is wider than media -> pillarbox on sides (black bars left and right)
    const renderWPercent = (frameAspect / containerAspect) * 100;
    const renderHPercent = 100;
    const offsetXPercent = (100 - renderWPercent) / 2;
    const offsetYPercent = 0;
    return { offsetXPercent, offsetYPercent, renderWPercent, renderHPercent };
  } else {
    // Container is taller than media -> letterbox on top/bottom
    const renderWPercent = 100;
    const renderHPercent = (containerAspect / frameAspect) * 100;
    const offsetXPercent = 0;
    const offsetYPercent = (100 - renderHPercent) / 2;
    return { offsetXPercent, offsetYPercent, renderWPercent, renderHPercent };
  }
}

export function mapNormalizedPin(
  x: number,
  y: number,
  offsets: { offsetXPercent: number; offsetYPercent: number; renderWPercent: number; renderHPercent: number }
): PinCenterStyle {
  const left = offsets.offsetXPercent + (x * offsets.renderWPercent);
  const top = offsets.offsetYPercent + (y * offsets.renderHPercent);
  return {
    left: `${left.toFixed(3)}%`,
    top: `${top.toFixed(3)}%`,
  };
}

export function mapNormalizedBBox(
  bbox: ArBBox,
  offsets: { offsetXPercent: number; offsetYPercent: number; renderWPercent: number; renderHPercent: number }
): BoxStyle {
  const left = offsets.offsetXPercent + (bbox.x * offsets.renderWPercent);
  const top = offsets.offsetYPercent + (bbox.y * offsets.renderHPercent);
  const width = bbox.w * offsets.renderWPercent;
  const height = bbox.h * offsets.renderHPercent;

  return {
    left: `${left.toFixed(3)}%`,
    top: `${top.toFixed(3)}%`,
    width: `${width.toFixed(3)}%`,
    height: `${height.toFixed(3)}%`,
  };
}

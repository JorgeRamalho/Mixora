import { visorBeatPhase } from "./visor-motion";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";

/** Giroscópio do holo-deck Camelot: tilt, glint e pulso de beat. */
export function bindCamelotStage(root: HTMLElement): () => void {
  const reduce = window.matchMedia(REDUCE_MOTION);
  const fine = window.matchMedia(FINE_POINTER);

  let frame = 0;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;

  const tick = (now: number) => {
    cx += (tx - cx) * 0.1;
    cy += (ty - cy) * 0.1;
    const pulse = 0.42 + 0.58 * Math.abs(Math.sin(visorBeatPhase(now) * Math.PI));
    const restX = reduce.matches ? 0 : 16;
    const restY = reduce.matches ? 0 : -6;
    root.style.setProperty("--gyro-x", `${(restX + cy * -9).toFixed(2)}deg`);
    root.style.setProperty("--gyro-y", `${(restY + cx * 11).toFixed(2)}deg`);
    root.style.setProperty("--glint-x", `${(48 + cx * 44).toFixed(1)}%`);
    root.style.setProperty("--glint-y", `${(24 + cy * 36).toFixed(1)}%`);
    root.style.setProperty("--beat-pulse", pulse.toFixed(3));
    frame = requestAnimationFrame(tick);
  };

  const onMove = (event: PointerEvent) => {
    if (reduce.matches || !fine.matches) return;
    const rect = root.getBoundingClientRect();
    tx = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    ty = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
  };

  const onLeave = () => {
    tx = 0;
    ty = 0;
  };

  root.addEventListener("pointermove", onMove, { passive: true });
  root.addEventListener("pointerleave", onLeave);
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerleave", onLeave);
  };
}

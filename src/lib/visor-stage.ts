import { visorBeatPhase } from "./visor-motion";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";

interface VisorStageOptions {
  /** Painel em faixa: sem tilt 3D, só brilho e pulso. */
  flat?: boolean;
}

/** Brilho, pulso de beat e — no modo 3D — inclinação do visor. */
export function bindVisorStage(root: HTMLElement, options: VisorStageOptions = {}): () => void {
  const reduce = window.matchMedia(REDUCE_MOTION);
  const fine = window.matchMedia(FINE_POINTER);
  const flat = options.flat === true;

  let frame = 0;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;

  const tick = (now: number) => {
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    const pulse = 0.42 + 0.58 * Math.abs(Math.sin(visorBeatPhase(now) * Math.PI));
    if (flat || reduce.matches) {
      root.style.setProperty("--tilt-x", "0deg");
      root.style.setProperty("--tilt-y", "0deg");
      root.style.setProperty("--parallax-x", "0px");
      root.style.setProperty("--parallax-y", "0px");
    } else {
      root.style.setProperty("--tilt-x", `${(3 + cy * -6).toFixed(2)}deg`);
      root.style.setProperty("--tilt-y", `${(cx * 7).toFixed(2)}deg`);
      root.style.setProperty("--parallax-x", `${(cx * 10).toFixed(2)}px`);
      root.style.setProperty("--parallax-y", `${(cy * 8).toFixed(2)}px`);
    }
    root.style.setProperty("--glint-x", `${(46 + cx * 42).toFixed(1)}%`);
    root.style.setProperty("--glint-y", `${(22 + cy * 38).toFixed(1)}%`);
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

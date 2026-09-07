const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
const SURFACE =
  ".card:not(.dj-portal), .plan-card, .form-section, .video-frame, .radio-eq-chassis, .radio-catalog-import, .mixer-board, .cdj-deck, .mixer-console, .cdj-jog";

function isHtml(node: EventTarget | null): node is HTMLElement {
  return node instanceof HTMLElement;
}

function clearTilt(el: HTMLElement): void {
  el.style.removeProperty("--tilt-x");
  el.style.removeProperty("--tilt-y");
  el.style.removeProperty("--glint-x");
  el.style.removeProperty("--glint-y");
}

function intensityFor(el: HTMLElement): number {
  const raw = el.dataset.stage;
  if (!raw) return 8;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 8;
}

/** Luz ambiente no palco + tilt 3D nas superfícies da cabine. */
export function bindStageLight(root: HTMLElement = document.documentElement): () => void {
  const reduce = window.matchMedia(REDUCE_MOTION);
  const fine = window.matchMedia(FINE_POINTER);

  let frame = 0;
  let px = 0.16;
  let py = 0.1;
  let tx = 0.16;
  let ty = 0.1;
  let active: HTMLElement | null = null;

  const tick = () => {
    px += (tx - px) * 0.1;
    py += (ty - py) * 0.1;
    root.style.setProperty("--pointer-x", `${(px * 100).toFixed(2)}%`);
    root.style.setProperty("--pointer-y", `${(py * 100).toFixed(2)}%`);
    frame = requestAnimationFrame(tick);
  };

  const onMove = (event: PointerEvent) => {
    if (reduce.matches || !fine.matches) return;
    tx = event.clientX / Math.max(1, window.innerWidth);
    ty = event.clientY / Math.max(1, window.innerHeight);

    const hit = isHtml(event.target) ? event.target.closest(SURFACE) : null;
    if (hit instanceof HTMLElement) {
      const rect = hit.getBoundingClientRect();
      const lx = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      const ly = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
      const amount = intensityFor(hit);
      hit.style.setProperty("--tilt-x", `${(-ly * amount).toFixed(2)}deg`);
      hit.style.setProperty("--tilt-y", `${(lx * amount).toFixed(2)}deg`);
      hit.style.setProperty("--glint-x", `${((lx + 0.5) * 100).toFixed(1)}%`);
      hit.style.setProperty("--glint-y", `${((ly + 0.5) * 100).toFixed(1)}%`);
      if (active && active !== hit) clearTilt(active);
      active = hit;
    } else if (active) {
      clearTilt(active);
      active = null;
    }
  };

  const onLeave = () => {
    if (active) {
      clearTilt(active);
      active = null;
    }
  };

  if (!reduce.matches) {
    frame = requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    if (active) clearTilt(active);
  };
}

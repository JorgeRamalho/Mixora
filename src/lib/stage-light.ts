const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
const MIXER_STAGE = ".mixer-stage";
const SURFACE =
  ".card:not(.dj-portal), .plan-card, .form-section, .video-frame, .radio-eq-chassis, .radio-catalog-import, .mixer-stage";
/** Suavização do glint do palco do mixer (0–1, menor = mais lento). */
const MIXER_GLINT_LERP = 0.055;

function isMixerStage(el: HTMLElement): boolean {
  return el.classList.contains("mixer-stage");
}

function clearTilt(el: HTMLElement): void {
  if (isMixerStage(el)) return;
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

/**
 * Amortece o eixo normalizado do ponteiro para evitar salto nas bordas.
 *
 * @param value Posição em [-0.5, 0.5] dentro do retângulo ativo.
 */
function softenPointerAxis(value: number): number {
  const scaled = value * 2;
  const softened = Math.tanh(scaled * 1.35) / Math.tanh(1.35);
  return softened * 0.5;
}

function resolveSurface(path: EventTarget[]): HTMLElement | null {
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    if (node.matches(MIXER_STAGE)) {
      return node instanceof HTMLElement ? node : null;
    }
  }
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    if (node.matches(SURFACE)) {
      return node instanceof HTMLElement ? node : null;
    }
  }
  return null;
}

function pathIncludesMixer(path: EventTarget[]): boolean {
  return path.some((node) => node instanceof Element && node.matches(MIXER_STAGE));
}

/** Luz ambiente no palco; tilt 3D só fora da cabine CDJ. */
export function bindStageLight(root: HTMLElement = document.documentElement): () => void {
  const reduce = window.matchMedia(REDUCE_MOTION);
  const fine = window.matchMedia(FINE_POINTER);

  let frame = 0;
  let px = 0.16;
  let py = 0.1;
  let tx = 0.16;
  let ty = 0.1;
  let active: HTMLElement | null = null;
  let mixerStageEl: HTMLElement | null = null;
  let targetGlintX = 50;
  let targetGlintY = 50;
  let smoothGlintX = 50;
  let smoothGlintY = 50;

  const tick = () => {
    px += (tx - px) * 0.1;
    py += (ty - py) * 0.1;
    root.style.setProperty("--pointer-x", `${(px * 100).toFixed(2)}%`);
    root.style.setProperty("--pointer-y", `${(py * 100).toFixed(2)}%`);

    let glintSettled = true;
    if (mixerStageEl) {
      smoothGlintX += (targetGlintX - smoothGlintX) * MIXER_GLINT_LERP;
      smoothGlintY += (targetGlintY - smoothGlintY) * MIXER_GLINT_LERP;
      mixerStageEl.style.setProperty("--glint-x", `${smoothGlintX.toFixed(1)}%`);
      mixerStageEl.style.setProperty("--glint-y", `${smoothGlintY.toFixed(1)}%`);
      glintSettled =
        Math.abs(targetGlintX - smoothGlintX) < 0.05 &&
        Math.abs(targetGlintY - smoothGlintY) < 0.05;
    }

    const pointerSettled = Math.abs(tx - px) < 0.0004 && Math.abs(ty - py) < 0.0004;
    if (pointerSettled && glintSettled) {
      frame = 0;
      return;
    }

    frame = requestAnimationFrame(tick);
  };

  const wakeAnimation = () => {
    if (frame === 0 && !reduce.matches) {
      frame = requestAnimationFrame(tick);
    }
  };

  const onMove = (event: PointerEvent) => {
    if (reduce.matches || !fine.matches) return;
    tx = event.clientX / Math.max(1, window.innerWidth);
    ty = event.clientY / Math.max(1, window.innerHeight);
    wakeAnimation();

    const path = event.composedPath();
    const insideMixer = pathIncludesMixer(path);
    const hit = resolveSurface(path);

    if (hit instanceof HTMLElement && isMixerStage(hit)) {
      const rect = hit.getBoundingClientRect();
      const lx = softenPointerAxis(
        (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5,
      );
      const ly = softenPointerAxis(
        (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5,
      );

      mixerStageEl = hit;
      targetGlintX = (lx + 0.5) * 100;
      targetGlintY = (ly + 0.5) * 100;

      if (active && active !== hit && !isMixerStage(active)) clearTilt(active);
      active = hit;
      return;
    }

    if (insideMixer && mixerStageEl) {
      const rect = mixerStageEl.getBoundingClientRect();
      const lx = softenPointerAxis(
        (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5,
      );
      const ly = softenPointerAxis(
        (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5,
      );
      targetGlintX = (lx + 0.5) * 100;
      targetGlintY = (ly + 0.5) * 100;
      active = mixerStageEl;
      return;
    }

    if (hit instanceof HTMLElement) {
      const rect = hit.getBoundingClientRect();
      const lx = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      const ly = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
      const amount = intensityFor(hit);
      hit.style.setProperty("--tilt-x", `${(-ly * amount).toFixed(2)}deg`);
      hit.style.setProperty("--tilt-y", `${(lx * amount).toFixed(2)}deg`);
      hit.style.setProperty("--glint-x", `${((lx + 0.5) * 100).toFixed(1)}%`);
      hit.style.setProperty("--glint-y", `${((ly + 0.5) * 100).toFixed(1)}%`);

      if (active && active !== hit && !isMixerStage(active)) clearTilt(active);
      active = hit;
      return;
    }

    if (active && !isMixerStage(active)) clearTilt(active);
    active = null;
  };

  const onLeave = () => {
    if (active && !isMixerStage(active)) clearTilt(active);
    active = null;
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
    if (active && !isMixerStage(active)) clearTilt(active);
    mixerStageEl = null;
  };
}

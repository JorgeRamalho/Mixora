/** Deck A no visor do hero — referência de tempo da cabine. */
export const VISOR_BPM = 124;

export const BEAT_MS = 60_000 / VISOR_BPM;

/** Um loop completo do ticker = 48 compassos (4/4) no BPM do visor. */
export const TICKER_BEATS_PER_LOOP = 192;

export function tickerLoopDurationMs(): number {
  return TICKER_BEATS_PER_LOOP * BEAT_MS;
}

/** Fase contínua em beats (mesmo relógio da waveform). */
export function visorBeatPhase(ms = performance.now()): number {
  return ms / BEAT_MS;
}

/** Deslocamento da waveform do canvas, alinhado ao grid de beats. */
export function visorWaveFrame(ms = performance.now()): number {
  const FRAMES_PER_BEAT = 29;
  return visorBeatPhase(ms) * FRAMES_PER_BEAT;
}

/** Progresso 0–1 de um ciclo do ticker. */
export function tickerLoopProgress(ms = performance.now()): number {
  const loopMs = tickerLoopDurationMs();
  return (ms % loopMs) / loopMs;
}

export function applyVisorMotionVars(root: HTMLElement = document.documentElement): void {
  root.style.setProperty("--visor-bpm", String(VISOR_BPM));
  root.style.setProperty("--ticker-duration", `${tickerLoopDurationMs() / 1000}s`);
}

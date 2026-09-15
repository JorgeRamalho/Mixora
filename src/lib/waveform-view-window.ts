/** Beats por compasso em grid 4/4. */
export const BEATS_PER_BAR = 4;

/** Bloco base da janela master: 4 compassos, ou seja 4×4 batidas. */
export const GRID_CYCLE_BARS = 4;

/** Batidas de histórico à esquerda do playhead, que fica fixo na atual. */
export const LOOKBACK_BEATS = 4;

/** Tamanho do loop sintético de treino, usado quando o engine ainda não publicou a duração. */
export const SYNTHETIC_LOOP_BEATS = 8;

/** Multiplicadores de zoom da janela 4×4, para configurar depois. */
export const MASTER_ZOOM_MULTIPLIERS = [1, 2, 3, 4, 6] as const;

/** Multiplicador de zoom da janela master. */
export type MasterZoomMultiplier = (typeof MASTER_ZOOM_MULTIPLIERS)[number];

/** Zoom inicial: 4 compassos visíveis. */
export const DEFAULT_MASTER_ZOOM: MasterZoomMultiplier = 1;

/** Compassos visíveis na waveform master no zoom atual. */
export const MASTER_VISIBLE_BARS = GRID_CYCLE_BARS * DEFAULT_MASTER_ZOOM;

/** As duas lanes usam a mesma janela; o zoom extra por deck vem depois. */
export const MASTER_LANE_A_VISIBLE_BARS = MASTER_VISIBLE_BARS;

/** Barras desenhadas na visão detalhada do topo. */
export const MASTER_DETAIL_BARS = 192;

/** Barras desenhadas na visão geral do deck. */
export const DECK_OVERVIEW_BARS = 160;

export type WaveformViewWindow = {
  windowStart: number;
  windowEnd: number;
  playheadT: number;
};

/**
 * Duração da faixa para a janela master, com fallback do loop de 8 beats.
 * @param bpm BPM efetivo do deck
 * @param durationSec Duração publicada pelo engine
 */
export function resolveDeckDurationSec(bpm: number, durationSec: number): number {
  if (durationSec > 0) return durationSec;
  if (bpm > 0) return (SYNTHETIC_LOOP_BEATS * 60) / bpm;
  return 0;
}

/**
 * Converte um número de compassos em fração da faixa pelo BPM.
 * @param bpm BPM efetivo do deck
 * @param durationSec Duração total da faixa em segundos
 * @param visibleBars Quantidade de compassos na janela
 */
export function barsToPhaseWindow(
  bpm: number,
  durationSec: number,
  visibleBars: number,
): number {
  return beatsToPhaseWindow(bpm, durationSec, visibleBars * BEATS_PER_BAR);
}

/**
 * Converte um número de batidas em fração da faixa pelo BPM.
 * @param bpm BPM efetivo do deck
 * @param durationSec Duração total da faixa em segundos
 * @param beats Quantidade de batidas
 */
export function beatsToPhaseWindow(bpm: number, durationSec: number, beats: number): number {
  if (bpm <= 0 || durationSec <= 0 || beats <= 0) return 0.14;
  const windowSec = beats * (60 / bpm);
  return Math.min(1, windowSec / durationSec);
}

/**
 * Resolve quantos compassos cabem na janela para um multiplicador 4×4.
 * @param zoom Multiplicador 1, 2, 3, 4 ou 6
 */
export function masterVisibleBarsForZoom(zoom: MasterZoomMultiplier): number {
  return GRID_CYCLE_BARS * zoom;
}

/**
 * Janela de detalhe com as últimas 4 batidas à esquerda e o cursor na atual.
 * @param phase Posição normalizada 0–1 na faixa
 * @param bpm BPM efetivo do deck
 * @param durationSec Duração total da faixa em segundos
 * @param visibleBars Quantidade de compassos na janela
 */
export function masterDetailWindow(
  phase: number,
  bpm: number,
  durationSec: number,
  visibleBars: number = MASTER_VISIBLE_BARS,
): WaveformViewWindow {
  const duration = resolveDeckDurationSec(bpm, durationSec);
  const windowFraction = barsToPhaseWindow(bpm, duration, visibleBars);
  const lookbackFraction = beatsToPhaseWindow(bpm, duration, LOOKBACK_BEATS);
  let windowStart = phase - lookbackFraction;
  let windowEnd = windowStart + windowFraction;

  if (windowStart < 0) {
    windowStart = 0;
    windowEnd = Math.min(1, windowFraction);
  } else if (windowEnd > 1) {
    windowEnd = 1;
    windowStart = Math.max(0, 1 - windowFraction);
  }

  const span = Math.max(windowEnd - windowStart, 0.0001);
  return {
    windowStart,
    windowEnd,
    playheadT: (phase - windowStart) / span,
  };
}

/**
 * Janela de visão geral da faixa inteira para o waveform do deck.
 * @param phase Posição normalizada 0–1 na faixa
 */
export function deckOverviewWindow(phase: number): WaveformViewWindow {
  return {
    windowStart: 0,
    windowEnd: 1,
    playheadT: phase,
  };
}

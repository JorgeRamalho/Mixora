import type { BeatGrid } from "../types/mixer";
import type { AudioAnalysisResponse, HotCueAnalysis } from "./tracks-api/types";
import { BEATS_PER_BAR, GRID_CYCLE_BARS } from "./waveform-view-window";

export type BeatMarkerKind = "beat" | "bar" | "phrase";

export type BeatMarker = {
  sec: number;
  x: number;
  kind: BeatMarkerKind;
  beatIndex: number;
};

/**
 * Mediana de uma lista de offsets, para amortecer ruído entre cues.
 * @param values Offsets em segundos
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

/**
 * Junta hot cues e structure cues com `bar` e `sec` finitos.
 * @param analysis Payload de GET .../audio/analysis
 */
function analysisCues(analysis: AudioAnalysisResponse): HotCueAnalysis[] {
  return [...(analysis.hot_cues ?? []), ...(analysis.structure_cues ?? [])].filter(
    (cue) => Number.isFinite(cue.sec) && Number.isFinite(cue.bar),
  );
}

/**
 * Reconstrói o beatgrid da análise V10.
 * O OpenAPI do MusicDiscover não expõe um array de batidas, ao passo que
 * `bpm_refined`, `bar_seconds` e os cues `bar`+`sec` já fecham BPM e offset.
 *
 * @param analysis Resposta de GET /audio/analysis
 */
export function beatGridFromAnalysis(
  analysis: AudioAnalysisResponse | null | undefined,
): BeatGrid | null {
  if (!analysis?.available) return null;

  const beatsPerBar = BEATS_PER_BAR;
  let barSec = analysis.bar_seconds ?? 0;
  let bpm = analysis.bpm_refined ?? 0;
  if (!(barSec > 0) && bpm > 0) {
    barSec = (60 / bpm) * beatsPerBar;
  }
  if (!(bpm > 0) && barSec > 0) {
    bpm = (60 / barSec) * beatsPerBar;
  }
  if (!(bpm > 0) || !(barSec > 0)) return null;

  const offsets = analysisCues(analysis).map((cue) => cue.sec - cue.bar * barSec);
  const phraseBars =
    analysis.phrase_bars && analysis.phrase_bars > 0 ? analysis.phrase_bars : GRID_CYCLE_BARS;

  return {
    bpm,
    offsetSec: offsets.length > 0 ? median(offsets) : 0,
    beatsPerBar,
    phraseBars,
  };
}

/**
 * Classifica o índice de batida em frase, compasso ou batida simples.
 * @param beatIndex Índice relativo ao beat 0 do grid, pode ser negativo
 * @param beatsPerBar Batidas por compasso
 * @param phraseBars Compassos por frase
 */
export function beatMarkerKind(
  beatIndex: number,
  beatsPerBar = BEATS_PER_BAR,
  phraseBars = GRID_CYCLE_BARS,
): BeatMarkerKind {
  const periodBar = Math.max(1, beatsPerBar);
  const periodPhrase = periodBar * Math.max(1, phraseBars);
  const wrapped = (value: number, period: number) => ((value % period) + period) % period;
  if (wrapped(beatIndex, periodPhrase) === 0) return "phrase";
  if (wrapped(beatIndex, periodBar) === 0) return "bar";
  return "beat";
}

/**
 * Marca batidas visíveis na janela normalizada da waveform.
 * @param windowStart Início da janela 0–1
 * @param windowEnd Fim da janela 0–1
 * @param durationSec Duração do arquivo em segundos
 * @param width Largura CSS do canvas
 * @param bpm BPM do grid, em arquivo e não no pitch ouvido
 * @param offsetSec Tempo do beat 0
 * @param beatsPerBar Batidas por compasso
 * @param phraseBars Compassos por frase
 */
export function beatMarkersInWindow(
  windowStart: number,
  windowEnd: number,
  durationSec: number,
  width: number,
  bpm: number,
  offsetSec = 0,
  beatsPerBar = BEATS_PER_BAR,
  phraseBars = GRID_CYCLE_BARS,
): BeatMarker[] {
  if (bpm <= 0 || durationSec <= 0 || width <= 0) return [];
  const span = windowEnd - windowStart;
  if (span <= 0) return [];

  const beatSec = 60 / bpm;
  const startSec = windowStart * durationSec;
  const endSec = windowEnd * durationSec;
  const firstIndex = Math.ceil((startSec - offsetSec) / beatSec - 1e-9);
  const lastIndex = Math.floor((endSec - offsetSec) / beatSec + 1e-9);
  const markers: BeatMarker[] = [];

  for (let beatIndex = firstIndex; beatIndex <= lastIndex; beatIndex += 1) {
    const sec = offsetSec + beatIndex * beatSec;
    const trackT = sec / durationSec;
    markers.push({
      sec,
      x: ((trackT - windowStart) / span) * width,
      kind: beatMarkerKind(beatIndex, beatsPerBar, phraseBars),
      beatIndex,
    });
  }
  return markers;
}

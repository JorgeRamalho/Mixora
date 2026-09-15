import { computePeaks } from "./waveform-peaks";
import { synthesizeBandsFromPeaks, synthesizeBandsFromWaveform } from "./waveform-bands-synthesize";
import type { WaveformV10Bands } from "../types/mixer";

/** Bins mínimos para o cache de detalhe master. */
export const DETAIL_BAND_BINS_MIN = 4096;

/** Bins máximos para o cache de detalhe master. */
export const DETAIL_BAND_BINS_MAX = 16384;

/** Densidade alvo de pontos por segundo no detalhe master. */
export const DETAIL_BAND_BINS_PER_SEC = 40;

/**
 * Resolve quantidade de bins por banda para o waveform de detalhe.
 *
 * @param durationSec Duração da faixa em segundos.
 */
export function resolveDetailBinCount(durationSec: number): number {
  const target = Math.floor(durationSec * DETAIL_BAND_BINS_PER_SEC);
  return Math.min(DETAIL_BAND_BINS_MAX, Math.max(DETAIL_BAND_BINS_MIN, target));
}

/**
 * Extrai bandas espectrais V10 de um buffer decodificado quando a API não envia V10.
 *
 * @param buffer Buffer decodificado do Web Audio.
 * @param binCount Quantidade de pontos por banda.
 */
export function computeWaveformBandsFromBuffer(
  buffer: AudioBuffer,
  binCount = 1500,
): WaveformV10Bands {
  const peaks = computePeaks(buffer, binCount);
  if (peaks.length === 0) {
    return synthesizeBandsFromPeaks(peaks);
  }
  const sorted = Array.from(peaks).sort((a, b) => a - b);
  const ceiling = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 1;
  const normalized =
    ceiling > 0.0001
      ? Float32Array.from(peaks, (value) => Math.min(1, value / ceiling))
      : peaks;
  return synthesizeBandsFromPeaks(normalized);
}

/**
 * Resolve bandas V10 a partir de picos mono, sem análise remota.
 *
 * @param peaks Picos mono do deck.
 */
export function waveformV10FromPeaks(peaks: Float32Array | null): WaveformV10Bands | null {
  if (!peaks || peaks.length === 0) return null;
  return synthesizeBandsFromPeaks(peaks);
}

/**
 * Resolve bandas V10 a partir de waveform mono V8/V9.
 *
 * @param waveform Amplitudes normalizadas da análise.
 */
export function waveformV10FromWaveform(waveform: readonly number[] | null | undefined): WaveformV10Bands | null {
  if (!waveform?.length) return null;
  return synthesizeBandsFromWaveform(waveform);
}

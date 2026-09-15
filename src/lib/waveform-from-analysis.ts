import type { WaveformV10Bands } from "../types/mixer";
import type { AudioAnalysisResponse, WaveformBandsModel } from "./tracks-api/types";
import { waveformV10FromWaveform } from "./waveform-bands-compute";

/**
 * Converte waveform V8 do backend em picos para o canvas da CDJ.
 * Reamostra para binCount quando o backend mandou mais ou menos pontos.
 *
 * @param waveform Amplitudes normalizadas 0–1 do MusicDiscover.
 * @param binCount Quantidade de bins do deck. Padrão 512.
 */
export function peaksFromAnalysis(waveform: number[], binCount = 512): Float32Array {
  const peaks = new Float32Array(binCount);
  if (waveform.length === 0) return peaks;

  for (let bin = 0; bin < binCount; bin += 1) {
    const sourceIndex = Math.floor((bin / binCount) * waveform.length);
    const value = waveform[sourceIndex] ?? 0;
    peaks[bin] = Math.max(0, Math.min(1, value));
  }
  return peaks;
}

/**
 * Reamostra bandas V10 para a quantidade de bins do deck.
 *
 * @param bands Envelopes espectrais V10.
 * @param binCount Quantidade de bins do canvas.
 */
export function peaksFromV10Bands(bands: WaveformV10Bands, binCount = 512): Float32Array {
  const peaks = new Float32Array(binCount);
  const sourceLength = bands.bass.length;
  if (sourceLength === 0) return peaks;

  for (let bin = 0; bin < binCount; bin += 1) {
    const sourceIndex = Math.floor((bin / binCount) * sourceLength);
    const bass = bands.bass[sourceIndex] ?? 0;
    const mids = bands.mids[sourceIndex] ?? 0;
    const highs = bands.highs[sourceIndex] ?? 0;
    peaks[bin] = Math.max(0, Math.min(1, Math.max(bass, mids, highs)));
  }
  return peaks;
}

/**
 * Valida e converte o payload `waveform_bands` da API em arrays tipados.
 *
 * @param bands Modelo V10 retornado pelo backend.
 */
export function parseWaveformBands(bands: WaveformBandsModel | null | undefined): WaveformV10Bands | null {
  if (!bands) return null;
  const { bass, mids, highs } = bands;
  if (bass.length === 0 || bass.length !== mids.length || mids.length !== highs.length) {
    return null;
  }
  return {
    bass: Float32Array.from(bass, (value) => Math.max(0, Math.min(1, value))),
    mids: Float32Array.from(mids, (value) => Math.max(0, Math.min(1, value))),
    highs: Float32Array.from(highs, (value) => Math.max(0, Math.min(1, value))),
  };
}

/**
 * Extrai bandas V10 da resposta de análise quando disponíveis.
 * Se o backend mandar só waveform V8/V9, sintetiza bass/mids/highs a partir do mono.
 *
 * @param analysis Resposta de GET /audio/analysis.
 */
export function analysisToWaveformV10(
  analysis: AudioAnalysisResponse | null | undefined,
): WaveformV10Bands | null {
  if (!analysis?.available) return null;
  const native = parseWaveformBands(analysis.waveform_bands);
  if (native) return native;
  return waveformV10FromWaveform(analysis.waveform);
}

/**
 * Extrai picos do payload de análise. Prefere V10 nativo quando `waveform_bands` existe.
 *
 * @param analysis Resposta de GET /audio/analysis.
 * @param binCount Quantidade de bins do deck. Padrão 512.
 */
export function analysisToPeaks(
  analysis: AudioAnalysisResponse | null | undefined,
  binCount = 512,
): Float32Array | null {
  const nativeBands = parseWaveformBands(analysis?.waveform_bands);
  if (nativeBands) return peaksFromV10Bands(nativeBands, binCount);
  if (!analysis?.available || !analysis.waveform?.length) return null;
  return peaksFromAnalysis(analysis.waveform, binCount);
}

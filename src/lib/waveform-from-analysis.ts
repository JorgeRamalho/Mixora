import type { AudioAnalysisResponse } from "./tracks-api/types";

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
 * Extrai picos do payload de análise quando V8 está disponível.
 *
 * @param analysis Resposta de GET /audio/analysis.
 * @param binCount Quantidade de bins do deck. Padrão 512.
 */
export function analysisToPeaks(
  analysis: AudioAnalysisResponse | null | undefined,
  binCount = 512,
): Float32Array | null {
  if (!analysis?.available || !analysis.waveform?.length) return null;
  return peaksFromAnalysis(analysis.waveform, binCount);
}

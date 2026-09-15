import type { WaveformV10Bands } from "../types/mixer";

/**
 * Limita amplitude normalizada entre 0 e 1.
 *
 * @param value Amplitude bruta.
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Média local em janela simétrica.
 *
 * @param waveform Amplitudes normalizadas 0–1.
 * @param index Índice atual.
 * @param radius Raio da janela em pontos.
 */
function localAvgAt(waveform: readonly number[], index: number, radius: number): number {
  const start = Math.max(0, index - radius);
  const end = Math.min(waveform.length - 1, index + radius);
  let sum = 0;
  let count = 0;
  for (let i = start; i <= end; i += 1) {
    sum += waveform[i] ?? 0;
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Calcula o teto P95 de uma série de amplitudes.
 *
 * @param series Amplitudes brutas da banda.
 */
function p95Ceiling(series: Float32Array | readonly number[]): number {
  if (series.length === 0) return 1;
  const sorted = Array.from(series).sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 1;
}

/**
 * Escala uma banda pelo teto P95 da própria série.
 *
 * @param series Amplitudes brutas da banda.
 * @param ceiling Teto P95 da banda.
 */
function normalizeBandByCeiling(series: Float32Array, ceiling: number): Float32Array {
  if (ceiling <= 0.0001) return series;
  return Float32Array.from(series, (value) => clamp01(value / ceiling));
}

/**
 * Normaliza cada banda pelo seu P95 independente para equilibrar grave, médio e agudo no canvas.
 *
 * @param bands Bandas brutas sintetizadas.
 */
function normalizeBandsForDisplay(bands: WaveformV10Bands): WaveformV10Bands {
  const length = bands.bass.length;
  if (length === 0) return bands;

  return {
    bass: normalizeBandByCeiling(bands.bass, p95Ceiling(bands.bass)),
    mids: normalizeBandByCeiling(bands.mids, p95Ceiling(bands.mids)),
    highs: normalizeBandByCeiling(bands.highs, p95Ceiling(bands.highs)),
  };
}

/**
 * Estima bandas bass/mids/highs a partir de waveform mono V8/V9.
 * Preserva transientes de kick em vez de suavizar em cunhas artificiais.
 *
 * @param waveform Amplitudes normalizadas da análise remota.
 */
export function synthesizeBandsFromWaveform(waveform: readonly number[]): WaveformV10Bands {
  const length = waveform.length;
  const bass = new Float32Array(length);
  const mids = new Float32Array(length);
  const highs = new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    const amp = clamp01(waveform[i] ?? 0);
    const prev = clamp01(waveform[Math.max(0, i - 1)] ?? 0);
    const lowEnv = localAvgAt(waveform, i, 9);
    const midEnv = localAvgAt(waveform, i, 3);
    const attack = Math.max(0, amp - prev * 0.55);
    const bright = Math.max(0, amp - lowEnv * 0.82);

    bass[i] = clamp01(Math.pow(lowEnv, 0.9) * 0.74);
    highs[i] = clamp01(attack * 2.3 + bright * 1.7);
    mids[i] = clamp01(Math.max(0, midEnv - lowEnv * 0.44) * 1.4 + amp * 0.14);
  }

  return normalizeBandsForDisplay({ bass, mids, highs });
}

/**
 * Estima bandas V10 a partir de picos mono já reamostrados no deck.
 *
 * @param peaks Picos mono 0–1 do deck.
 */
export function synthesizeBandsFromPeaks(peaks: Float32Array): WaveformV10Bands {
  return synthesizeBandsFromWaveform(peaks);
}

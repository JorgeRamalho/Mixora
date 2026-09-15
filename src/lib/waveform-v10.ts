import type { WaveformV10Bands } from "../types/mixer";

/**
 * Amostra uma banda V10 na posição normalizada 0–1 da faixa.
 *
 * @param band Array de amplitudes da banda.
 * @param trackT Posição normalizada na faixa.
 */
export function sampleBandAt(band: Float32Array, trackT: number): number {
  if (band.length === 0) return 0;
  const index = Math.min(band.length - 1, Math.floor(trackT * band.length));
  return band[index] ?? 0;
}

/**
 * Amostra uma banda V10 com interpolação linear entre pontos.
 *
 * @param band Array de amplitudes da banda.
 * @param trackT Posição normalizada na faixa 0–1.
 */
export function sampleBandInterpolated(band: Float32Array, trackT: number): number {
  if (band.length === 0) return 0;
  if (band.length === 1) return band[0] ?? 0;
  const scaled = trackT * (band.length - 1);
  const index0 = Math.floor(scaled);
  const index1 = Math.min(band.length - 1, index0 + 1);
  const mix = scaled - index0;
  const value0 = band[index0] ?? 0;
  const value1 = band[index1] ?? 0;
  return value0 * (1 - mix) + value1 * mix;
}

/**
 * Cor RGB proporcional às energias bass/mids/highs, no estilo Rekordbox.
 *
 * @param bass Amplitude da banda grave 0–1.
 * @param mids Amplitude da banda média 0–1.
 * @param highs Amplitude da banda aguda 0–1.
 */
export function rekordboxBandColor(bass: number, mids: number, highs: number): string {
  const sum = bass + mids + highs + 0.0001;
  const r = Math.min(255, 48 + (highs / sum) * 210);
  const g = Math.min(255, 42 + (mids / sum) * 200);
  const b = Math.min(255, 72 + (bass / sum) * 190);
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

/**
 * Amostra as três bandas V10 na posição normalizada da faixa.
 *
 * @param bands Envelopes espectrais do backend.
 * @param trackT Posição normalizada 0–1.
 */
export function sampleWaveformV10At(
  bands: WaveformV10Bands,
  trackT: number,
): { bass: number; mids: number; highs: number; amp: number } {
  const bass = sampleBandAt(bands.bass, trackT);
  const mids = sampleBandAt(bands.mids, trackT);
  const highs = sampleBandAt(bands.highs, trackT);
  return { bass, mids, highs, amp: Math.max(bass, mids, highs) };
}

/**
 * Amostra o pico máximo das três bandas V10 em um intervalo normalizado.
 *
 * @param bands Envelopes espectrais do backend.
 * @param trackT0 Início do intervalo 0–1.
 * @param trackT1 Fim do intervalo 0–1.
 */
export function sampleWaveformV10MaxInRange(
  bands: WaveformV10Bands,
  trackT0: number,
  trackT1: number,
): { bass: number; mids: number; highs: number } {
  const length = bands.bass.length;
  if (length === 0) return { bass: 0, mids: 0, highs: 0 };

  const idx0 = Math.max(0, Math.floor(trackT0 * length));
  const idx1 = Math.min(length - 1, Math.max(idx0, Math.ceil(trackT1 * length) - 1));

  let bass = 0;
  let mids = 0;
  let highs = 0;
  for (let i = idx0; i <= idx1; i += 1) {
    bass = Math.max(bass, bands.bass[i] ?? 0);
    mids = Math.max(mids, bands.mids[i] ?? 0);
    highs = Math.max(highs, bands.highs[i] ?? 0);
  }
  return { bass, mids, highs };
}

/**
 * Amostra as três bandas V10 com interpolação linear na posição da faixa.
 *
 * @param bands Envelopes espectrais do backend.
 * @param trackT Posição normalizada 0–1.
 */
export function sampleWaveformV10Interpolated(
  bands: WaveformV10Bands,
  trackT: number,
): { bass: number; mids: number; highs: number } {
  return {
    bass: sampleBandInterpolated(bands.bass, trackT),
    mids: sampleBandInterpolated(bands.mids, trackT),
    highs: sampleBandInterpolated(bands.highs, trackT),
  };
}

/**
 * Clona as bandas V10 para o snapshot imutável do React.
 *
 * @param bands Bandas originais do deck.
 */
export function cloneWaveformV10(bands: WaveformV10Bands | null): WaveformV10Bands | null {
  if (!bands) return null;
  return {
    bass: bands.bass.slice(),
    mids: bands.mids.slice(),
    highs: bands.highs.slice(),
  };
}

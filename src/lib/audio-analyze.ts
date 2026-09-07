import { camelotFromPitchClass } from "./musical-key";

/** Buffer mínimo para a análise de BPM e tom — `AudioBuffer` já serve. */
export interface AnalyzableBuffer {
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  getChannelData(channel: number): Float32Array;
}

export interface TrackAnalysis {
  bpm: number;
  key: string;
}

const MIN_BPM = 70;
const MAX_BPM = 180;
const HOP_SEC = 0.01;
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * Mixa os canais num trecho curto o bastante para a IA da cabine responder
 * na hora, sem varrer o arquivo inteiro.
 *
 * @param buffer Áudio já decodificado.
 * @param maxSec Segundos máximos a ler, a partir do começo.
 */
export function mixMonoSlice(buffer: AnalyzableBuffer, maxSec = 24): Float32Array {
  const sampleRate = buffer.sampleRate || 44100;
  const length = Math.min(buffer.length, Math.floor(sampleRate * maxSec));
  const mono = new Float32Array(length);
  const channels = Math.max(1, buffer.numberOfChannels);
  for (let ch = 0; ch < channels; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / channels;
    }
  }
  return mono;
}

/**
 * Estima BPM pelo envelope de energia e autocorrelação no intervalo 70–180.
 *
 * @param samples Mono.
 * @param sampleRate Hz.
 */
export function detectBpm(samples: Float32Array, sampleRate: number): number {
  const hop = Math.max(1, Math.floor(sampleRate * HOP_SEC));
  const count = Math.floor(samples.length / hop);
  if (count < 32) return 120;

  const onset = new Float32Array(count);
  let prev = 0;
  for (let i = 0; i < count; i += 1) {
    let energy = 0;
    const start = i * hop;
    for (let j = 0; j < hop && start + j < samples.length; j += 1) {
      const s = samples[start + j] ?? 0;
      energy += s * s;
    }
    onset[i] = Math.max(0, energy - prev);
    prev = energy;
  }

  const minLag = Math.round(60 / MAX_BPM / HOP_SEC);
  const maxLag = Math.min(onset.length - 2, Math.round(60 / MIN_BPM / HOP_SEC));
  let bestLag = minLag;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let corr = 0;
    for (let i = 0; i < onset.length - lag; i += 1) {
      corr += (onset[i] ?? 0) * (onset[i + lag] ?? 0);
    }
    if (corr > best) {
      best = corr;
      bestLag = lag;
    }
  }

  const bpm = 60 / (bestLag * HOP_SEC);
  if (bpm < MIN_BPM || bpm > MAX_BPM) return 120;
  return Math.round(bpm * 10) / 10;
}

function goertzelPower(frame: Float32Array, sampleRate: number, freq: number): number {
  const n = frame.length;
  const k = Math.round((n * freq) / sampleRate);
  const w = (2 * Math.PI * k) / n;
  const coeff = 2 * Math.cos(w);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i += 1) {
    s0 = (frame[i] ?? 0) + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}

function pitchClassFreq(pc: number, octave: number): number {
  return 440 * 2 ** ((pc - 9) / 12 + (octave - 4));
}

function correlate(chroma: number[], profile: number[], shift: number): number {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += (chroma[i] ?? 0) * (profile[(i - shift + 12) % 12] ?? 0);
  }
  return sum;
}

/**
 * Estima a hora Camelot pelo perfil de Krumhansl sobre o chroma de 12 notas.
 *
 * @param samples Mono.
 * @param sampleRate Hz.
 */
export function detectCamelotKey(samples: Float32Array, sampleRate: number): string {
  const chroma = new Array<number>(12).fill(0);
  const windowSize = 2048;
  const hop = 4096;
  if (samples.length < windowSize) return "8A";

  for (let start = 0; start + windowSize <= samples.length; start += hop) {
    const frame = samples.subarray(start, start + windowSize);
    for (let pc = 0; pc < 12; pc += 1) {
      let mag = 0;
      for (let oct = 2; oct <= 5; oct += 1) {
        mag += goertzelPower(frame, sampleRate, pitchClassFreq(pc, oct));
      }
      chroma[pc] = (chroma[pc] ?? 0) + mag;
    }
  }

  let best = -Infinity;
  let bestPc = 0;
  let bestMode: "maior" | "menor" = "menor";
  for (let shift = 0; shift < 12; shift += 1) {
    const major = correlate(chroma, KK_MAJOR, shift);
    const minor = correlate(chroma, KK_MINOR, shift);
    if (major > best) {
      best = major;
      bestPc = shift;
      bestMode = "maior";
    }
    if (minor > best) {
      best = minor;
      bestPc = shift;
      bestMode = "menor";
    }
  }

  return camelotFromPitchClass(bestPc, bestMode);
}

/**
 * Lê BPM e tom Camelot de um buffer — a “IA” local da cabine, sem rede.
 *
 * @param buffer Áudio do deck.
 */
export function analyzeAudioBuffer(buffer: AnalyzableBuffer): TrackAnalysis {
  const sampleRate = buffer.sampleRate || 44100;
  const mono = mixMonoSlice(buffer);
  return {
    bpm: detectBpm(mono, sampleRate),
    key: detectCamelotKey(mono, sampleRate),
  };
}

import type { WaveformV10Bands } from "../types/mixer";
import { beatMarkersInWindow } from "./beat-grid";
import { sampleBandInterpolated } from "./waveform-v10";
import { BEATS_PER_BAR, GRID_CYCLE_BARS } from "./waveform-view-window";
import {
  DEFAULT_WAVEFORM_ACCENT,
  paintWaveformBackdrop,
  resolveWaveformLayerRgb,
  WAVEFORM_LAYER_OPACITY,
} from "./waveform-palette";

export type WaveLayerId = "bass" | "mids" | "highs" | "mono";

type LayerRgbMap = Record<WaveLayerId, [number, number, number]>;

/** Clones espelhados por banda, no estilo Cavasik overlapping+normal mirror. */
export const WAVEFORM_MIRROR_CLONES = 3;

/** Escala vertical de cada clone interno em relação ao anterior. */
export const WAVEFORM_MIRROR_RATIO = 0.88;

/** Decaimento de opacidade por clone para o miolo não saturar. */
const WAVEFORM_CLONE_ALPHA_DECAY = 0.82;

/** Desfoque do glow neon no envelope externo. */
const NEON_GLOW_BLUR = 9;

/** Máximo de segmentos Bézier por onda; evita um path por pixel em canvases largos. */
export const DRAW_PATH_MAX_SAMPLES = 360;

const FILL_PLAYED = 0.52;
const FILL_UNPLAYED = 0.34;
const STROKE_PLAYED = 0.98;
const STROKE_UNPLAYED = 0.78;
const AMP_PADDING = 2;

/**
 * Limita um valor ao intervalo 0–1 dos envelopes.
 * @param value Amplitude bruta
 */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Máximo pontual de várias séries alinhadas no mesmo grid de pixels.
 * @param seriesList Amplitudes por camada
 */
export function pointwiseMax(seriesList: Array<Float32Array | readonly number[]>): Float32Array {
  if (seriesList.length === 0) return new Float32Array(0);
  const n = seriesList[0]?.length ?? 0;
  const out = new Float32Array(n);
  for (let index = 0; index < n; index += 1) {
    let peak = 0;
    for (const series of seriesList) {
      peak = Math.max(peak, series[index] ?? 0);
    }
    out[index] = peak;
  }
  return out;
}

/**
 * Buffers reutilizáveis para evitar alocação a cada frame de waveform.
 */
export type WaveformDrawScratch = {
  layerBuffers: Float32Array[];
  pathSamples: Float32Array;
  pathEnvelope: Float32Array;
};

/**
 * Garante um buffer de amplitudes com capacidade para a largura atual.
 * @param scratch Estado reutilizável do canvas
 * @param index Índice da camada espectral
 * @param count Pontos necessários no viewport
 */
function ensureLayerBuffer(scratch: WaveformDrawScratch | undefined, index: number, count: number): Float32Array {
  if (!scratch) {
    return new Float32Array(count);
  }
  let buffer = scratch.layerBuffers[index];
  if (!buffer || buffer.length !== count) {
    buffer = new Float32Array(count);
    scratch.layerBuffers[index] = buffer;
  }
  return buffer;
}

/**
 * Amostra um envelope no viewport, um ponto por pixel inclusive a borda direita.
 * @param series Envelope 0–1
 * @param windowStart Início normalizado 0–1
 * @param windowEnd Fim normalizado 0–1
 * @param width Largura CSS do canvas
 * @param scratch Buffers reutilizáveis para repaint animado
 * @param layerIndex Índice da camada no scratch
 */
export function sampleViewportAmplitudes(
  series: Float32Array | readonly number[],
  windowStart: number,
  windowEnd: number,
  width: number,
  scratch?: WaveformDrawScratch,
  layerIndex = 0,
): Float32Array {
  const span = Math.max(windowEnd - windowStart, 0.0001);
  const safeWidth = Math.max(1, width);
  const count = Math.max(1, Math.floor(safeWidth) + 1);
  const length = series.length;
  const out = ensureLayerBuffer(scratch, layerIndex, count);
  for (let px = 0; px < count; px += 1) {
    const trackT = windowStart + (px / safeWidth) * span;
    if (length === 0) {
      out[px] = 0;
      continue;
    }
    if (series instanceof Float32Array) {
      out[px] = clamp01(sampleBandInterpolated(series, trackT));
      continue;
    }
    if (length === 1) {
      out[px] = clamp01(series[0] ?? 0);
      continue;
    }
    const pos = trackT * (length - 1);
    const index0 = Math.max(0, Math.min(length - 1, Math.floor(pos)));
    const index1 = Math.min(length - 1, index0 + 1);
    const frac = pos - index0;
    const left = series[index0] ?? 0;
    const right = series[index1] ?? left;
    out[px] = clamp01(left + (right - left) * frac);
  }
  return out;
}

/**
 * Envelope visível quando o deck de treino ainda não tem picos nem V10.
 * @param length Quantidade de pontos do placeholder
 */
export function syntheticPlaceholderPeaks(length = 256): Float32Array {
  const out = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const t = index / Math.max(length - 1, 1);
    const kick = Math.abs(Math.sin(t * Math.PI * 8));
    const hat = Math.abs(Math.sin(t * Math.PI * 32));
    out[index] = clamp01(0.18 + 0.62 * kick * (0.4 + 0.6 * hat));
  }
  return out;
}

/**
 * Envelope travado na batida, para o zoom 4×4 do loop sintético não virar uma linha.
 * @param windowStart Início normalizado da janela
 * @param windowEnd Fim normalizado da janela
 * @param width Largura CSS do canvas
 * @param bpm BPM efetivo do deck
 * @param durationSec Duração da faixa em segundos
 */
export function sampleSyntheticBeatAmplitudes(
  windowStart: number,
  windowEnd: number,
  width: number,
  bpm: number,
  durationSec: number,
  scratch?: WaveformDrawScratch,
  layerIndex = 0,
): Float32Array {
  const span = Math.max(windowEnd - windowStart, 0.0001);
  const safeWidth = Math.max(1, width);
  const count = Math.max(1, Math.floor(safeWidth) + 1);
  const beatSec = bpm > 0 ? 60 / bpm : 0.5;
  const duration = durationSec > 0 ? durationSec : 1;
  const out = ensureLayerBuffer(scratch, layerIndex, count);
  for (let px = 0; px < count; px += 1) {
    const trackT = windowStart + (px / safeWidth) * span;
    const beat = (trackT * duration) / beatSec;
    const beatFrac = beat - Math.floor(beat);
    const kick = (1 - beatFrac) ** 1.55;
    const offbeat = beatFrac > 0.48 && beatFrac < 0.62 ? 0.28 : 0.08;
    out[px] = clamp01(0.2 + 0.72 * kick + offbeat);
  }
  return out;
}

/**
 * Escolhe as camadas overlapping V10 ou o fallback mono.
 * @param bands Bandas espectrais do deck
 * @param peaks Picos mono quando não há V10
 */
export function resolveWaveLayers(
  bands: WaveformV10Bands | null,
  peaks: Float32Array | null,
): Array<{ id: WaveLayerId; values: Float32Array }> {
  if (bands && bands.bass.length > 0 && bands.bass.length === bands.mids.length && bands.mids.length === bands.highs.length) {
    return [
      { id: "bass", values: bands.bass },
      { id: "mids", values: bands.mids },
      { id: "highs", values: bands.highs },
    ];
  }
  if (peaks && peaks.length > 0) {
    return [{ id: "mono", values: peaks }];
  }
  return [{ id: "mono", values: syntheticPlaceholderPeaks() }];
}

/**
 * Reamostra o envelope para um path leve, preservando picos locais.
 * @param source Amplitudes por pixel do viewport
 * @param drawWidth Largura CSS do canvas
 * @param scratch Buffer reutilizável do repaint
 */
export function resampleForDrawPath(
  source: Float32Array | readonly number[],
  drawWidth: number,
  scratch?: WaveformDrawScratch,
): Float32Array {
  const targetCount = Math.min(
    Math.max(2, Math.floor(drawWidth) + 1),
    DRAW_PATH_MAX_SAMPLES + 1,
  );
  if (source.length <= targetCount) {
    return source instanceof Float32Array ? source : Float32Array.from(source);
  }

  let out = scratch?.pathSamples;
  if (!out || out.length !== targetCount) {
    out = new Float32Array(targetCount);
    if (scratch) scratch.pathSamples = out;
  }

  const bucketSize = source.length / targetCount;
  for (let index = 0; index < targetCount; index += 1) {
    const start = Math.floor(index * bucketSize);
    const end = Math.min(source.length, Math.floor((index + 1) * bucketSize) + 1);
    let peak = 0;
    for (let sample = start; sample < end; sample += 1) {
      peak = Math.max(peak, source[sample] ?? 0);
    }
    out[index] = peak;
  }
  return out;
}

/**
 * Monta um path fechado de onda suavizada e espelhada no centro.
 * @param ctx Contexto 2D
 * @param amplitudes Amostras 0–1 do path
 * @param mid Linha central em pixels
 * @param scale Altura máxima da crista
 * @param drawWidth Largura CSS do canvas
 */
function traceMirroredWave(
  ctx: CanvasRenderingContext2D,
  amplitudes: Float32Array | readonly number[],
  mid: number,
  scale: number,
  drawWidth: number,
): void {
  const n = amplitudes.length;
  if (n === 0) return;
  const xAt = (index: number) => (index / Math.max(n - 1, 1)) * drawWidth;
  const upperY = (index: number) => mid - (amplitudes[index] ?? 0) * scale;
  const lowerY = (index: number) => mid + (amplitudes[index] ?? 0) * scale;

  ctx.beginPath();
  ctx.moveTo(xAt(0), upperY(0));
  if (n === 1) {
    ctx.lineTo(xAt(0), lowerY(0));
    ctx.closePath();
    return;
  }
  for (let index = 0; index < n - 1; index += 1) {
    const x0 = xAt(index);
    const x1 = xAt(index + 1);
    const y0 = upperY(index);
    const y1 = upperY(index + 1);
    const step = (x1 - x0) * 0.5;
    ctx.bezierCurveTo(x0 + step, y0, x0 + step, y1, x1, y1);
  }
  ctx.lineTo(xAt(n - 1), lowerY(n - 1));
  for (let index = n - 1; index > 0; index -= 1) {
    const x0 = xAt(index);
    const x1 = xAt(index - 1);
    const y0 = lowerY(index);
    const y1 = lowerY(index - 1);
    const step = (x0 - x1) * 0.5;
    ctx.bezierCurveTo(x0 - step, y0, x0 - step, y1, x1, y1);
  }
  ctx.closePath();
}

/**
 * Gradiente espelhado que abre no centro, como o fill neon do Cavasik.
 * @param ctx Contexto 2D
 * @param mid Linha central em pixels
 * @param scale Altura máxima da crista
 * @param rgb Componentes RGB da camada
 * @param alpha Opacidade do pico
 */
function neonMirrorFillGradient(
  ctx: CanvasRenderingContext2D,
  mid: number,
  scale: number,
  rgb: [number, number, number],
  alpha: number,
): CanvasGradient {
  const [red, green, blue] = rgb;
  const gradient = ctx.createLinearGradient(0, mid - scale, 0, mid + scale);
  gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${alpha})`);
  gradient.addColorStop(0.45, `rgba(${red}, ${green}, ${blue}, ${alpha * 0.38})`);
  gradient.addColorStop(0.5, `rgba(${red}, ${green}, ${blue}, 0)`);
  gradient.addColorStop(0.55, `rgba(${red}, ${green}, ${blue}, ${alpha * 0.38})`);
  gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, ${alpha})`);
  return gradient;
}

/**
 * Opacidade do clone espelhado, com decaimento em direção ao centro.
 * @param fillAlpha Opacidade base do recorte
 * @param layerOpacity Peso espectral da banda
 * @param clone Índice do clone, 0 na borda externa
 */
function cloneFillAlpha(fillAlpha: number, layerOpacity: number, clone: number): number {
  const depth = WAVEFORM_MIRROR_CLONES - clone;
  return fillAlpha * layerOpacity * WAVEFORM_CLONE_ALPHA_DECAY ** depth;
}

/**
 * Preenche ribbons neon overlapping com espelho normal, no estilo Cavasik waves mode.
 * Cada banda desenha clones em escala decrescente; o menor fica no fundo e o maior na frente.
 *
 * @param ctx Contexto 2D
 * @param layers Amplitudes por banda já amostradas
 * @param layerRgb RGB Camelot de cada camada
 * @param height Altura do canvas
 * @param clipStart Início horizontal do recorte
 * @param clipEnd Fim horizontal do recorte
 * @param fillAlpha Opacidade do fill
 * @param strokeAlpha Opacidade do stroke do envelope
 */
function fillWaveLayers(
  ctx: CanvasRenderingContext2D,
  layers: Array<{ id: WaveLayerId; amplitudes: Float32Array }>,
  layerRgb: LayerRgbMap,
  height: number,
  drawWidth: number,
  clipStart: number,
  clipEnd: number,
  fillAlpha: number,
  strokeAlpha: number,
  scratch?: WaveformDrawScratch,
): void {
  if (clipEnd <= clipStart || layers.length === 0) return;
  const mid = height / 2;
  const scale = Math.max(1, mid - AMP_PADDING);
  const pathLayers = layers.map((layer) => ({
    id: layer.id,
    path: resampleForDrawPath(layer.amplitudes, drawWidth, scratch),
  }));

  let envelope = scratch?.pathEnvelope;
  if (!envelope || envelope.length !== pathLayers[0]?.path.length) {
    envelope = new Float32Array(pathLayers[0]?.path.length ?? 0);
    if (scratch) scratch.pathEnvelope = envelope;
  }
  for (let index = 0; index < envelope.length; index += 1) {
    let peak = 0;
    for (const layer of pathLayers) {
      peak = Math.max(peak, layer.path[index] ?? 0);
    }
    envelope[index] = peak;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipStart, 0, clipEnd - clipStart, height);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";

  for (const layer of pathLayers) {
    const rgb = layerRgb[layer.id];
    const layerOpacity =
      layer.id === "mono" ? WAVEFORM_LAYER_OPACITY.mids : WAVEFORM_LAYER_OPACITY[layer.id];
    for (let clone = WAVEFORM_MIRROR_CLONES; clone >= 0; clone -= 1) {
      const cloneScale = scale * WAVEFORM_MIRROR_RATIO ** clone;
      const alpha = cloneFillAlpha(fillAlpha, layerOpacity, clone);
      ctx.fillStyle = neonMirrorFillGradient(ctx, mid, cloneScale, rgb, alpha);
      traceMirroredWave(ctx, layer.path, mid, cloneScale, drawWidth);
      ctx.fill();
    }
  }

  const strokeRgb = layerRgb[layers[layers.length - 1]?.id ?? "mono"];
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = NEON_GLOW_BLUR;
  ctx.shadowColor = `rgba(${strokeRgb[0]}, ${strokeRgb[1]}, ${strokeRgb[2]}, ${strokeAlpha * 0.85})`;
  ctx.strokeStyle = `rgba(${strokeRgb[0]}, ${strokeRgb[1]}, ${strokeRgb[2]}, ${strokeAlpha})`;
  ctx.lineWidth = 1.25;
  traceMirroredWave(ctx, envelope, mid, scale, drawWidth);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * Desenha linhas de beat, compasso e frase na visão detalhada.
 * Os tempos vêm do beatgrid da análise, em tempo de arquivo, porque o envelope
 * do canvas também está em tempo de arquivo e o pitch não deve deslocar as barras.
 *
 * @param ctx Contexto 2D
 * @param windowStart Início da janela normalizada
 * @param windowEnd Fim da janela normalizada
 * @param bpm BPM do grid no arquivo
 * @param durationSec Duração total da faixa em segundos
 * @param width Largura CSS do canvas
 * @param height Altura CSS do canvas
 * @param offsetSec Tempo do beat 0
 * @param phraseBars Compassos por frase
 * @param beatsPerBar Batidas por compasso
 */
export function drawWaveBeatGrid(
  ctx: CanvasRenderingContext2D,
  windowStart: number,
  windowEnd: number,
  bpm: number,
  durationSec: number,
  width: number,
  height: number,
  offsetSec = 0,
  phraseBars = GRID_CYCLE_BARS,
  beatsPerBar = BEATS_PER_BAR,
): void {
  const markers = beatMarkersInWindow(
    windowStart,
    windowEnd,
    durationSec,
    width,
    bpm,
    offsetSec,
    beatsPerBar,
    phraseBars,
  );

  for (const marker of markers) {
    ctx.strokeStyle =
      marker.kind === "phrase"
        ? "rgba(248, 250, 252, 0.34)"
        : marker.kind === "bar"
          ? "rgba(226, 232, 240, 0.2)"
          : "rgba(148, 163, 184, 0.12)";
    ctx.lineWidth = marker.kind === "phrase" ? 1.35 : marker.kind === "bar" ? 1.1 : 1;
    ctx.beginPath();
    ctx.moveTo(marker.x, 0);
    ctx.lineTo(marker.x, height);
    ctx.stroke();
  }
}

export type DiscoverWaveformPaint = {
  width: number;
  height: number;
  windowStart: number;
  windowEnd: number;
  playheadT: number;
  bands: WaveformV10Bands | null;
  peaks: Float32Array | null;
  showBeatGrid?: boolean;
  bpm?: number;
  durationSec?: number;
  offsetSec?: number;
  phraseBars?: number;
  beatsPerBar?: number;
  camelotKey?: string | null;
  accentColor?: string | null;
  scratch?: WaveformDrawScratch;
};

/**
 * Pinta a waveform Discover no viewport visível, com overlapping e espelho.
 * @param ctx Contexto 2D
 * @param options Viewport, bandas e playhead
 */
export function drawDiscoverWaveform(
  ctx: CanvasRenderingContext2D,
  options: DiscoverWaveformPaint,
): void {
  const {
    width,
    height,
    windowStart,
    windowEnd,
    playheadT,
    bands,
    peaks,
    showBeatGrid = false,
    bpm = 0,
    durationSec = 0,
    offsetSec = 0,
    phraseBars = GRID_CYCLE_BARS,
    beatsPerBar = BEATS_PER_BAR,
    camelotKey = null,
    accentColor = null,
    scratch,
  } = options;

  const layerRgb = resolveWaveformLayerRgb(camelotKey, accentColor);
  const accent = accentColor || DEFAULT_WAVEFORM_ACCENT;

  ctx.clearRect(0, 0, width, height);
  paintWaveformBackdrop(ctx, width, height, accent);

  const hasRealEnvelope =
    Boolean(bands && bands.bass.length > 0) || Boolean(peaks && peaks.length > 0);
  const layers = hasRealEnvelope
    ? resolveWaveLayers(bands, peaks).map((layer, index) => ({
        id: layer.id,
        amplitudes: sampleViewportAmplitudes(
          layer.values,
          windowStart,
          windowEnd,
          width,
          scratch,
          index,
        ),
      }))
    : [
        {
          id: "mono" as const,
          amplitudes: sampleSyntheticBeatAmplitudes(
            windowStart,
            windowEnd,
            width,
            bpm,
            durationSec,
            scratch,
            0,
          ),
        },
      ];

  const playX = Math.max(0, Math.min(width, playheadT * width));
  fillWaveLayers(ctx, layers, layerRgb, height, width, 0, playX, FILL_PLAYED, STROKE_PLAYED, scratch);
  fillWaveLayers(
    ctx,
    layers,
    layerRgb,
    height,
    width,
    playX,
    width,
    FILL_UNPLAYED,
    STROKE_UNPLAYED,
    scratch,
  );
  ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
  ctx.fillRect(playX, 0, width - playX, height);

  if (showBeatGrid) {
    drawWaveBeatGrid(
      ctx,
      windowStart,
      windowEnd,
      bpm,
      durationSec,
      width,
      height,
      offsetSec,
      phraseBars,
      beatsPerBar,
    );
  }

  ctx.shadowBlur = 4;
  ctx.shadowColor = "rgba(248, 250, 252, 0.75)";
  ctx.strokeStyle = "rgba(248, 250, 252, 0.96)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(playX, 0);
  ctx.lineTo(playX, height);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/**
 * Destaca na overview a janela visível no master, na cor Camelot da faixa.
 * @param ctx Contexto 2D
 * @param windowStart Início normalizado
 * @param windowEnd Fim normalizado
 * @param width Largura CSS
 * @param height Altura CSS
 * @param accentRgb RGB da hora Camelot
 */
export function drawDetailWindowHighlight(
  ctx: CanvasRenderingContext2D,
  windowStart: number,
  windowEnd: number,
  width: number,
  height: number,
  accentRgb: [number, number, number] = [56, 189, 248],
): void {
  const x = windowStart * width;
  const w = (windowEnd - windowStart) * width;
  if (w <= 0) return;
  const [red, green, blue] = accentRgb;
  ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.12)`;
  ctx.fillRect(x, 0, w, height);
  ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, 0.5)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, 0.5, Math.max(0, w - 1), height - 1);
}

/**
 * Mini waveform da collection no mesmo traço Discover, só envelope mono.
 * @param ctx Contexto 2D
 * @param samples Amplitudes compactas da API
 * @param width Largura CSS
 * @param height Altura CSS
 * @param camelotKey Código Camelot da linha
 * @param accentColor Cor da hora Camelot
 */
export function drawCollectionWavePreview(
  ctx: CanvasRenderingContext2D,
  samples: readonly number[] | null | undefined,
  width: number,
  height: number,
  camelotKey?: string | null,
  accentColor?: string | null,
): void {
  const peaks = Float32Array.from(samples && samples.length > 0 ? samples : [0.08]);
  drawDiscoverWaveform(ctx, {
    width,
    height,
    windowStart: 0,
    windowEnd: 1,
    playheadT: 1,
    bands: null,
    peaks,
    showBeatGrid: false,
    camelotKey,
    accentColor,
  });
}

import { useEffect, useRef } from "react";
import { engine } from "../../lib/audio-engine";
import { getCamelotKey, keyAfterSemitoneShift, normalizeCamelotCode } from "../../lib/musical-key";
import type { BeatGrid, DeckId, WaveformV10Bands } from "../../types/mixer";
import {
  drawDetailWindowHighlight,
  drawDiscoverWaveform,
  type WaveformDrawScratch,
} from "../../lib/waveform-draw-waves";
import { resolveWaveformLayerRgb } from "../../lib/waveform-palette";
import {
  deckOverviewWindow,
  masterDetailWindow,
  MASTER_VISIBLE_BARS,
  resolveDeckDurationSec,
} from "../../lib/waveform-view-window";
import { subscribeWaveformFrame } from "../../lib/waveform-raf-scheduler";

export type WaveformVariant = "master" | "deck";

/** Limita o DPR no deck; o master usa resolução maior para nitidez. */
const MAX_DECK_WAVE_DPR = 2;
const MAX_MASTER_WAVE_DPR = 2;

type DeckWaveformProps = {
  id: DeckId;
  spinning: boolean;
  phase: number;
  bpm: number;
  durationSec: number;
  peaks: Float32Array | null;
  waveformV10: WaveformV10Bands | null;
  accentColor: string;
  camelotKey?: string | null;
  variant?: WaveformVariant;
  /** Compassos visíveis no master; padrão do bloco 4×4. */
  masterVisibleBars?: number;
};

type WaveformPaintState = {
  phase: number;
  bpm: number;
  durationSec: number;
  camelotKey: string | null;
  accentColor: string;
};

/**
 * Código Camelot que está soando no deck, já com KEY SYNC.
 * @param id Deck consultado
 * @param fallback Código vindo das props quando o engine ainda não resolveu
 */
function liveCamelotCode(id: DeckId, fallback?: string | null): string | null {
  const deck = engine.snapshot[id];
  const shifted = keyAfterSemitoneShift(deck.track.key, deck.keyShift);
  return shifted?.code ?? normalizeCamelotCode(deck.track.key) ?? fallback ?? null;
}

/**
 * Ajusta o backing store retina do canvas visível.
 * @param canvas Elemento canvas
 * @param dpr Fator de pixel ratio limitado
 */
function syncCanvasSize(canvas: HTMLCanvasElement, dpr: number): { width: number; height: number } {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width < 2 || height < 2) {
    return { width: 0, height: 0 };
  }
  const nextW = Math.max(1, Math.floor(width * dpr));
  const nextH = Math.max(1, Math.floor(height * dpr));
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }
  return { width, height };
}

/**
 * Pinta um frame Discover no viewport do deck ou do master.
 * @param ctx Contexto 2D
 * @param canvas Canvas visível
 * @param state Fase, BPM e duração atuais
 * @param isDeck Se é overview da faixa inteira
 * @param peaks Picos mono
 * @param waveformV10 Bandas V10
 * @param beatGrid Grid da análise, se o LOAD remoto já reconstituiu BPM e offset
 * @param masterVisibleBars Compassos visíveis no detalhe
 * @param scratch Buffers reutilizáveis para repaint animado
 */
function paintWaveformFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: WaveformPaintState,
  isDeck: boolean,
  peaks: Float32Array | null,
  waveformV10: WaveformV10Bands | null,
  beatGrid: BeatGrid | null,
  masterVisibleBars: number,
  scratch: WaveformDrawScratch,
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, isDeck ? MAX_DECK_WAVE_DPR : MAX_MASTER_WAVE_DPR);
  const { width, height } = syncCanvasSize(canvas, dpr);
  if (width < 2 || height < 2) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const gridBpm = beatGrid?.bpm || state.bpm;
  const durationSec = resolveDeckDurationSec(gridBpm, state.durationSec);
  const view = isDeck
    ? deckOverviewWindow(state.phase)
    : masterDetailWindow(state.phase, gridBpm, durationSec, masterVisibleBars);

  drawDiscoverWaveform(ctx, {
    width,
    height,
    windowStart: view.windowStart,
    windowEnd: view.windowEnd,
    playheadT: view.playheadT,
    bands: waveformV10,
    peaks,
    showBeatGrid: !isDeck,
    bpm: gridBpm,
    durationSec,
    offsetSec: beatGrid?.offsetSec ?? 0,
    phraseBars: beatGrid?.phraseBars,
    beatsPerBar: beatGrid?.beatsPerBar,
    camelotKey: state.camelotKey,
    accentColor: state.accentColor,
    scratch,
  });

  if (isDeck) {
    const detail = masterDetailWindow(state.phase, gridBpm, durationSec, masterVisibleBars);
    const accentRgb = resolveWaveformLayerRgb(state.camelotKey, state.accentColor).mids;
    drawDetailWindowHighlight(ctx, detail.windowStart, detail.windowEnd, width, height, accentRgb);
  }
}

/**
 * Canvas de waveform Discover: detalhe no master e faixa inteira no CDJ.
 * @param props Lado, fase, BPM, duração, picos ou bandas V10 e variante visual
 */
export function DeckWaveform({
  id,
  spinning,
  phase,
  bpm,
  durationSec,
  peaks,
  waveformV10,
  accentColor,
  camelotKey = null,
  variant = "master",
  masterVisibleBars = MASTER_VISIBLE_BARS,
}: DeckWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDeck = variant === "deck";

  const paintStateRef = useRef<WaveformPaintState>({
    phase,
    bpm,
    durationSec,
    camelotKey: camelotKey ?? null,
    accentColor,
  });
  paintStateRef.current = {
    phase,
    bpm,
    durationSec,
    camelotKey: camelotKey ?? null,
    accentColor,
  };

  const peaksRef = useRef(peaks);
  peaksRef.current = peaks;
  const bandsRef = useRef(waveformV10);
  bandsRef.current = waveformV10;
  const scratchRef = useRef<WaveformDrawScratch>({
    layerBuffers: [],
    pathSamples: new Float32Array(0),
    pathEnvelope: new Float32Array(0),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const render = () => {
      const live = engine.snapshot[id];
      const sounding = liveCamelotCode(id, paintStateRef.current.camelotKey);
      paintWaveformFrame(
        ctx,
        canvas,
        {
          phase: engine.livePhase(id),
          bpm: engine.effectiveBpm(id) || paintStateRef.current.bpm,
          durationSec: live.durationSec || paintStateRef.current.durationSec,
          camelotKey: sounding,
          accentColor: getCamelotKey(sounding ?? "")?.color ?? paintStateRef.current.accentColor,
        },
        isDeck,
        live.peaks ?? peaksRef.current,
        live.waveformV10 ?? bandsRef.current,
        live.beatGrid,
        masterVisibleBars,
        scratchRef.current,
      );
    };

    const observer = new ResizeObserver(() => render());
    observer.observe(canvas);

    render();

    const unsubscribe = spinning ? subscribeWaveformFrame(render) : undefined;

    return () => {
      observer.disconnect();
      unsubscribe?.();
    };
  }, [isDeck, masterVisibleBars, spinning, id, peaks, waveformV10]);

  const label = isDeck
    ? `Visão geral da faixa no deck ${id.toUpperCase()}`
    : `Waveform detalhada de ${masterVisibleBars} compassos no deck ${id.toUpperCase()}`;

  return (
    <div
      className={isDeck ? "cdj-deck-wave-hit" : "mixer-wave-hit"}
      data-waveform-mode={isDeck ? "overview" : "detail"}
      data-waveform-v10={waveformV10 ? "true" : "false"}
      data-beat-grid={engine.snapshot[id].beatGrid ? "true" : "false"}
      data-camelot={camelotKey ?? ""}
      aria-label={label}
    >
      <canvas
        ref={canvasRef}
        className={isDeck ? "cdj-deck-wave" : "mixer-wave"}
        aria-hidden="true"
      />
    </div>
  );
}

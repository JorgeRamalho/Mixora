import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  consumeLoadClickSuppression,
  deckFileInputId,
  openDeckFileDialog,
} from "../../lib/deck-file-picker";
import { pitchSliderStyle } from "../../lib/range-slider-style";
import { engine } from "../../lib/audio-engine";
import { getCamelotKey, harmonicDistance, resolveMusicalKey } from "../../lib/musical-key";
import type { BrowseSource, DeckId, MixerAction } from "../../types";
import type { BrowseTrackItem } from "../../types/mixer";
import { DeckPlaylist } from "./DeckPlaylist";

/** Fração da faixa visível no modo zoom, centrada no playhead. */
const WAVE_ZOOM_WINDOW = 0.14;
const WAVE_NORMAL_BARS = 64;
const WAVE_ZOOM_BARS = 160;

function Waveform({
  id,
  spinning,
  phase,
  peaks,
  accentColor,
}: {
  id: DeckId;
  spinning: boolean;
  phase: number;
  peaks: Float32Array | null;
  /** Cor Camelot da faixa carregada, para o traço da waveform. */
  accentColor: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const bins = new Uint8Array(256);

    const draw = () => {
      const analyser = engine.analyser(id);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const base = accentColor;
      ctx.fillStyle = "rgba(7, 11, 18, 0.92)";
      ctx.fillRect(0, 0, width, height);

      const barCount = zoomed ? WAVE_ZOOM_BARS : WAVE_NORMAL_BARS;
      let windowStart = 0;
      let windowEnd = 1;
      if (zoomed) {
        const half = WAVE_ZOOM_WINDOW / 2;
        windowStart = Math.max(0, phase - half);
        windowEnd = Math.min(1, phase + half);
        if (windowEnd - windowStart < WAVE_ZOOM_WINDOW) {
          if (windowStart === 0) windowEnd = Math.min(1, WAVE_ZOOM_WINDOW);
          else if (windowEnd === 1) windowStart = Math.max(0, 1 - WAVE_ZOOM_WINDOW);
        }
      }

      for (let bar = 0; bar < barCount; bar += 1) {
        const trackT = windowStart + (bar / barCount) * (windowEnd - windowStart);
        const x = (bar / barCount) * width;
        const fromPeaks =
          peaks && peaks.length > 0
            ? (peaks[Math.floor(trackT * peaks.length)] ?? 0) * (zoomed ? 48 : 36)
            : Math.sin(bar * 0.55 + phase * Math.PI * 2) * 6;
        const h = 8 + fromPeaks + (bar % 4 === 0 ? 14 : 6);
        const grad = ctx.createLinearGradient(0, height - h, 0, height);
        grad.addColorStop(0, `${base}88`);
        grad.addColorStop(1, `${base}22`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, height - h, width / barCount - 1, h);
      }

      const playheadT = zoomed
        ? (phase - windowStart) / Math.max(windowEnd - windowStart, 0.0001)
        : phase;
      const playhead = playheadT * width;
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playhead, 0);
      ctx.lineTo(playhead, height);
      ctx.stroke();

      if (analyser) {
        analyser.getByteTimeDomainData(bins);
        ctx.strokeStyle = base;
        ctx.lineWidth = 1.4;
        ctx.shadowBlur = spinning ? 12 : 4;
        ctx.shadowColor = base;
        ctx.beginPath();
        bins.forEach((value, index) => {
          const x = (index / bins.length) * width;
          const y = height * 0.35 + ((value ?? 128) / 255) * height * 0.22;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [accentColor, id, phase, spinning, peaks, zoomed]);

  return (
    <button
      type="button"
      className="cdj-wave-hit"
      data-zoomed={zoomed ? "true" : "false"}
      aria-pressed={zoomed}
      aria-label={
        zoomed
          ? `Waveform deck ${id.toUpperCase()} ampliada. Clique para visão geral`
          : `Waveform deck ${id.toUpperCase()}. Clique para ampliar`
      }
      onClick={() => setZoomed((current) => !current)}
    >
      <canvas ref={ref} className="cdj-wave" aria-hidden="true" />
    </button>
  );
}

/**
 * Ícone de eject para o botão LOAD do deck.
 */
function EjectIcon() {
  return (
    <svg className="cdj-eject-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 4 12h5v6h6v-6h5L12 4z" fill="currentColor" />
      <rect x="5" y="19" width="14" height="2" rx="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Texto do tooltip do LOAD conforme a fonte ativa do browse.
 *
 * @param browseSource Fonte USB local ou biblioteca remota.
 */
function loadTooltipCopy(browseSource: BrowseSource): string {
  if (browseSource === "remote") {
    return "Carregar a música selecionada no browse";
  }
  return "Carregar arquivo de áudio no deck";
}

/**
 * Rótulo do hardware exibido no topo do deck.
 *
 * @param id Lado da cabine.
 * @param midiConnected Indica se a DDJ-400 está conectada.
 */
function deckHardwareLabel(id: DeckId, midiConnected: boolean): string {
  if (midiConnected) return "DDJ-400";
  return id === "a" ? "CDJ-3000" : "CDJ-3000XJ";
}

function JogWheel({
  id,
  playing,
  mode,
  onNudge,
}: {
  id: DeckId;
  playing: boolean;
  mode: "vinyl" | "cdj";
  onNudge: (direction: -1 | 1) => void;
}) {
  const lastY = useRef(0);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    lastY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const delta = event.clientY - lastY.current;
    if (Math.abs(delta) > 6) {
      onNudge(delta > 0 ? -1 : 1);
      lastY.current = event.clientY;
    }
  };

  return (
    <div className="cdj-jog-shell">
      <div
        className="cdj-jog"
        data-playing={playing ? "true" : "false"}
        data-mode={mode}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        role="slider"
        aria-label={`Jog wheel deck ${id.toUpperCase()}`}
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <span className="cdj-jog-cap" aria-hidden="true" />
        <span className="cdj-jog-ring" aria-hidden="true" />
      </div>
      <p className="cdj-jog-label">{mode === "vinyl" ? "VINYL · SCRUB" : "CDJ · NUDGE"}</p>
    </div>
  );
}

export function CdjDeck({
  id,
  masterKey,
  loadPending = false,
  browseSource = "local",
  midiConnected = false,
  libraryLoading = false,
  remoteLoad,
  onRetryRemote,
  browseKeyFilter = null,
  browseActive = false,
  playlistTracks = [],
  loadedTrackId = "",
  browseCursor = 0,
  keyFilterFlash = 0,
  onSelectTrack,
  onKeyMetricClick,
  onLoadPrepare,
  onFile,
  onChange,
}: {
  id: DeckId;
  masterKey: string;
  loadPending?: boolean;
  browseSource?: BrowseSource;
  /** DDJ-400 conectada via Web MIDI — troca o rótulo do hardware. */
  midiConnected?: boolean;
  /** Biblioteca remota ainda sem primeira resposta da API. */
  libraryLoading?: boolean;
  remoteLoad?: { status: string; message?: string };
  onRetryRemote?: () => void;
  /** Filtro Camelot ativo na biblioteca compartilhada. */
  browseKeyFilter?: string | null;
  /** Indica se o encoder BROWSE navega esta playlist no momento. */
  browseActive?: boolean;
  playlistTracks?: readonly BrowseTrackItem[];
  loadedTrackId?: string;
  browseCursor?: number;
  keyFilterFlash?: number;
  onSelectTrack?: (trackId: string) => void;
  /** Abre a roda Camelot para escolher o filtro de tom. */
  onKeyMetricClick?: () => void;
  /** Limpa o arm do LOAD MIDI antes do gesto nativo do arquivo. */
  onLoadPrepare?: () => void;
  /** Callback quando o aluno escolhe um arquivo no picker. */
  onFile: (file: File) => void;
  onChange: (action: MixerAction) => void;
}) {
  const deck = engine.snapshot[id];
  const bpm = engine.effectiveBpm(id).toFixed(2);
  const musical = resolveMusicalKey(deck.track.key);
  const harmony = harmonicDistance(masterKey, deck.track.key);
  const remoteBusy =
    remoteLoad?.status === "checking" ||
    remoteLoad?.status === "preparing" ||
    remoteLoad?.status === "decoding";
  const remoteCopy = remoteLoadCopy(remoteLoad?.status, remoteLoad?.message);
  const camelotColor = getCamelotKey(deck.track.key)?.color ?? "#8b8fa8";
  const deckStyle = { "--camelot-color": camelotColor } as CSSProperties;
  const loadTooltip = loadTooltipCopy(browseSource);
  const hardwareLabel = deckHardwareLabel(id, midiConnected);

  const pitchInputValue = -deck.pitch;
  const pitchFader = (
    <label className="cdj-pitch cdj-pitch--hero">
      <span className="cdj-pitch-label">PITCH · TEMPO</span>
      <div className="cdj-pitch-slider">
        <input
          className="cdj-pitch-input"
          type="range"
          min={-8}
          max={8}
          step={0.1}
          value={pitchInputValue}
          style={pitchSliderStyle(pitchInputValue)}
          aria-label={`Pitch deck ${id.toUpperCase()}`}
          aria-valuetext={`${deck.pitch.toFixed(1)}%`}
          onChange={(event) =>
            onChange({ type: "pitch", id, value: -Number(event.target.value) })
          }
        />
      </div>
      <span className="cdj-pitch-value">{deck.pitch.toFixed(1)}%</span>
    </label>
  );

  return (
    <section
      className="cdj-deck"
      data-deck={id}
      data-playing={deck.playing ? "true" : "false"}
      data-phase={deck.phase.toFixed(3)}
      data-bpm={engine.effectiveBpm(id).toFixed(2)}
      data-key={deck.track.key}
      data-source-kind={deck.sourceKind}
      data-peaks-ready={deck.peaks && deck.peaks.length > 0 ? "true" : "false"}
      data-cue-sec={deck.sourceKind === "file" ? String(deck.cueBeat) : undefined}
      data-pitch={deck.pitch.toFixed(2)}
      data-eq-high={String(deck.eq.high)}
      data-loop-active={deck.loop.active ? "true" : "false"}
      data-load-pending={loadPending ? "true" : "false"}
      data-loading={remoteBusy ? "true" : "false"}
      data-browse-source={browseSource}
      style={deckStyle}
      aria-label={`Deck ${id.toUpperCase()}`}
    >
      <header className="cdj-deck-top">
        <div className="cdj-brand">
          <span className="cdj-brand-mark">{hardwareLabel}</span>
          <span className="cdj-brand-grid">{deck.track.grid}</span>
        </div>
        <div className="cdj-deck-top-end">
          <button
            type="button"
            className="cdj-btn cdj-btn--load cdj-btn--eject"
            data-deck-load={id}
            data-pending={loadPending ? "true" : "false"}
            aria-label={`Carregar deck ${id.toUpperCase()}: ${loadTooltip}`}
            title={loadTooltip}
            disabled={libraryLoading && browseSource === "remote"}
            onClick={() => {
              if (browseSource === "remote") {
                onChange({ type: "requestDeckLoad", id });
                return;
              }
              if (consumeLoadClickSuppression()) return;
              onLoadPrepare?.();
              void openDeckFileDialog(id, onFile);
            }}
          >
            <EjectIcon />
            <span className="cdj-load-tooltip" role="tooltip">{loadTooltip}</span>
          </button>
          <input
            id={deckFileInputId(id)}
            type="file"
            className="mixer-deck-file-input"
            accept="audio/*,.mp3,.wav,.flac,.aac,.m4a,.ogg"
            data-deck-file={id}
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) onFile(file);
            }}
          />
          <div className="cdj-status-leds" aria-hidden="true">
            <span data-on={deck.sync ? "true" : "false"}>SYNC</span>
            <span data-on={deck.masterTempo ? "true" : "false"}>M.TEMPO</span>
            <span data-on={deck.loop.active ? "true" : "false"}>LOOP</span>
          </div>
        </div>
      </header>

      <div className="cdj-display">
        <span className="cdj-display-glint" aria-hidden="true" />
        <div className="cdj-track-meta">
          <strong>{deck.track.title}</strong>
          <span>{deck.track.artist}</span>
          <span className="cdj-genre">{deck.track.genre}</span>
        </div>
        {remoteCopy ? (
          <p className="cdj-remote-load" role={remoteLoad?.status === "error" ? "alert" : "status"}>
            <span>{remoteCopy}</span>
            {remoteLoad?.status === "error" ? (
              <button
                type="button"
                className="cdj-remote-retry"
                onClick={() => onRetryRemote?.()}
              >
                Tentar de novo
              </button>
            ) : null}
          </p>
        ) : null}
        <div className="cdj-metrics">
          <div className="cdj-metric cdj-metric--bpm">
            <span className="cdj-metric-label">BPM</span>
            <span className="cdj-metric-value">{bpm}</span>
            <span className="cdj-metric-sub">Pitch {deck.pitch.toFixed(1)}%</span>
          </div>
          {onKeyMetricClick ? (
            <button
              type="button"
              className="cdj-metric cdj-metric--key"
              data-harmony={harmony}
              data-filter-active={browseKeyFilter ? "true" : "false"}
              aria-label={`Tom ${deck.track.key}. Clique para filtrar a biblioteca por escala Camelot`}
              onClick={() => onKeyMetricClick()}
            >
              <span className="cdj-metric-label">KEY</span>
              <span className="cdj-metric-value">{deck.track.key}</span>
              <span className="cdj-metric-sub">{musical.label}</span>
            </button>
          ) : (
            <div className="cdj-metric cdj-metric--key" data-harmony={harmony}>
              <span className="cdj-metric-label">KEY</span>
              <span className="cdj-metric-value">{deck.track.key}</span>
              <span className="cdj-metric-sub">{musical.label}</span>
            </div>
          )}
          <div className="cdj-metric cdj-metric--phase">
            <span className="cdj-metric-label">PHASE</span>
            <span
              className="cdj-phase-ring"
              style={{ "--phase": deck.phase } as CSSProperties}
            >
              <span className="cdj-phase-dot" aria-hidden="true" />
            </span>
          </div>
        </div>
        <div className="cdj-display-wave">
          <Waveform
            id={id}
            phase={deck.phase}
            spinning={deck.playing}
            peaks={deck.peaks}
            accentColor={camelotColor}
          />
        </div>
      </div>

      <div className="cdj-transport-primary">
        <p className="cdj-transport-label">Comandos principais</p>
        <div className="cdj-transport" aria-label={`Transporte deck ${id.toUpperCase()}`}>
          <button
            className="cdj-btn cdj-btn--primary cdj-btn--cue"
            type="button"
            aria-label={`Cue deck ${id.toUpperCase()}: segure para tocar a partir do ponto de cue`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              onChange({ type: "cuePress", id });
            }}
            onPointerUp={(event) => {
              onChange({ type: "cueRelease", id });
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onPointerCancel={() => onChange({ type: "cueRelease", id })}
          >
            CUE
          </button>
          <button
            className="cdj-btn cdj-btn--primary cdj-btn--play"
            type="button"
            onClick={() => onChange({ type: "toggle", id })}
          >
            {deck.playing ? "Pause" : "Play"}
          </button>
          <button
            className={`cdj-btn cdj-btn--primary cdj-btn--sync${deck.sync ? " is-on" : ""}`}
            type="button"
            aria-pressed={deck.sync}
            onClick={() => onChange({ type: "sync", id, value: !deck.sync })}
          >
            SYNC
          </button>
          <button
            className={`cdj-btn cdj-btn--primary cdj-btn--master${deck.masterTempo ? " is-on" : ""}`}
            type="button"
            aria-pressed={deck.masterTempo}
            onClick={() => onChange({ type: "masterDeck", id })}
          >
            MASTER
          </button>
        </div>
      </div>

      <div className="cdj-jog-row">
        <div className="cdj-jog-row-side cdj-jog-row-side--left">
          {id === "a" ? pitchFader : null}
        </div>
        <JogWheel
          id={id}
          mode={deck.jogMode}
          playing={deck.playing}
          onNudge={(direction) => onChange({ type: "nudge", id, direction })}
        />
        <div className="cdj-jog-row-side cdj-jog-row-side--right">
          {id === "b" ? pitchFader : null}
        </div>
      </div>

      <div className="cdj-jog-modes" role="group" aria-label={`Modos do prato deck ${id.toUpperCase()}`}>
        <button
          className={`cdj-jog-mode${deck.jogMode === "vinyl" ? " is-on" : ""}`}
          type="button"
          aria-pressed={deck.jogMode === "vinyl"}
          onClick={() =>
            onChange({ type: "jogMode", id, value: deck.jogMode === "vinyl" ? "cdj" : "vinyl" })
          }
        >
          VINYL
        </button>
        <button
          className={`cdj-jog-mode${deck.quantize ? " is-on" : ""}`}
          type="button"
          aria-pressed={deck.quantize}
          onClick={() => onChange({ type: "quantize", id, value: !deck.quantize })}
        >
          QUANTIZE
        </button>
      </div>

      <DeckPlaylist
        deckId={id}
        variant="inline"
        tracks={playlistTracks}
        loadedTrackId={loadedTrackId}
        browseCursor={browseCursor}
        browseSource={browseSource}
        libraryLoading={libraryLoading}
        browseKeyFilter={browseKeyFilter}
        keyFilterFlash={keyFilterFlash}
        browseActive={browseActive}
        camelotColor={camelotColor}
        onSelectTrack={onSelectTrack ?? (() => undefined)}
      />
    </section>
  );
}

/**
 * Texto do LOAD remoto no visor do deck.
 *
 * @param status Fase atual, ou ausente se o deck está ocioso.
 * @param message Erro vindo da API.
 */
function remoteLoadCopy(status?: string, message?: string): string | null {
  if (status === "checking") return "Verificando áudio…";
  if (status === "preparing") return "Preparando faixa…";
  if (status === "decoding") return "Decodificando…";
  if (status === "error") return message ?? "Falha ao carregar a faixa remota";
  return null;
}

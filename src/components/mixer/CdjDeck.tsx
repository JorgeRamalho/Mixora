import {
  memo,
  useCallback,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { deckFileInputId } from "../../lib/deck-file-picker";
import { formatDeckClock } from "../../lib/deck-clock";
import { useDeckTransportMirror } from "../../lib/use-deck-transport-mirror";
import { cdjDeckViewEqual, selectCdjDeckView } from "../../lib/mixer-component-selectors";
import { pitchSliderStyle } from "../../lib/range-slider-style";
import { isCollectionDragActive, subscribeCollectionDrag } from "../../lib/collection-drag";
import { useMixerSelector } from "../../lib/use-mixer-selector";
import type { DeckId, MixerAction } from "../../types";
import { HOT_CUE_SLOTS } from "../../types/mixer";
import { MASTER_VISIBLE_BARS } from "../../lib/waveform-view-window";
import { DeckWaveform } from "./DeckWaveform";

const PAD_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const PITCH_RANGE = 8;

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

/** Texto do tooltip do LOAD da faixa selecionada na collection. */
const LOAD_TOOLTIP = "Carregar a música selecionada no browse";

function JogWheel({
  id,
  playing,
  mode,
  bpm,
  pitch,
  onNudge,
}: {
  id: DeckId;
  playing: boolean;
  mode: "vinyl" | "cdj";
  bpm: string;
  pitch: number;
  onNudge: (direction: -1 | 1) => void;
}) {
  const lastY = useRef(0);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isCollectionDragActive()) return;
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
        <span className="cdj-jog-cap" aria-hidden="true">
          <span className="cdj-jog-bpm">{bpm}</span>
          <span className="cdj-jog-pitch">
            {pitch.toFixed(1)}% ±{PITCH_RANGE}
          </span>
        </span>
        <span className="cdj-jog-ring" aria-hidden="true" />
      </div>
    </div>
  );
}

type CdjDeckProps = {
  id: DeckId;
  masterKey: string;
  loadPending?: boolean;
  midiConnected?: boolean;
  libraryLoading?: boolean;
  remoteLoad?: { status: string; message?: string };
  onRetryRemote?: () => void;
  browseKeyFilter?: string | null;
  onKeyMetricClick?: () => void;
  onFile: (file: File) => void;
  onChange: (action: MixerAction) => void;
};

/**
 * Compara props estáveis do CDJ e ignora re-renders do pai quando só o snapshot global mudou.
 *
 * @param previous Props anteriores.
 * @param next Props novas.
 */
function cdjDeckPropsEqual(previous: CdjDeckProps, next: CdjDeckProps): boolean {
  return (
    previous.id === next.id &&
    previous.masterKey === next.masterKey &&
    previous.loadPending === next.loadPending &&
    previous.midiConnected === next.midiConnected &&
    previous.libraryLoading === next.libraryLoading &&
    previous.browseKeyFilter === next.browseKeyFilter &&
    previous.remoteLoad?.status === next.remoteLoad?.status &&
    previous.remoteLoad?.message === next.remoteLoad?.message &&
    previous.onRetryRemote === next.onRetryRemote &&
    previous.onKeyMetricClick === next.onKeyMetricClick &&
    previous.onFile === next.onFile &&
    previous.onChange === next.onChange
  );
}

export const CdjDeck = memo(function CdjDeck({
  id,
  masterKey,
  loadPending = false,
  midiConnected = false,
  libraryLoading = false,
  remoteLoad,
  onRetryRemote,
  browseKeyFilter = null,
  onKeyMetricClick,
  onFile,
  onChange,
}: CdjDeckProps) {
  const dropActive = useSyncExternalStore(
    subscribeCollectionDrag,
    isCollectionDragActive,
    () => false,
  );
  const sectionRef = useRef<HTMLElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const remainRef = useRef<HTMLSpanElement>(null);
  useDeckTransportMirror(id, sectionRef, elapsedRef, remainRef);
  const deck = useMixerSelector(
    useCallback((snapshot) => selectCdjDeckView(snapshot, id, masterKey), [id, masterKey]),
    cdjDeckViewEqual,
  );
  const remoteBusy =
    remoteLoad?.status === "checking" ||
    remoteLoad?.status === "preparing" ||
    remoteLoad?.status === "decoding";
  const remoteCopy = remoteLoadCopy(remoteLoad?.status, remoteLoad?.message);
  const deckStyle = { "--camelot-color": deck.camelotColor } as CSSProperties;
  const loadTooltip = LOAD_TOOLTIP;
  const remainingSec = Math.max(0, deck.durationSec || 0);
  const keySyncHint = deck.sync
    ? "Casar o tom no rótulo, sem alterar a velocidade enquanto o beat sync estiver ligado"
    : "Casar o tom com o deck mestre e alterar a velocidade do áudio";

  const pitchInputValue = -deck.pitch;
  const pitchFader = (
    <label className="cdj-pitch cdj-pitch--hero">
      <span className="cdj-pitch-label">PITCH</span>
      <div className="cdj-pitch-slider">
        <input
          className="cdj-pitch-input"
          type="range"
          min={-PITCH_RANGE}
          max={PITCH_RANGE}
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
      ref={sectionRef}
      className="cdj-deck"
      data-deck={id}
      data-playing={deck.playing ? "true" : "false"}
      data-bpm={deck.effectiveBpm}
      data-key={deck.track.key}
      data-source-kind={deck.sourceKind}
      data-peaks-ready={deck.peaks && deck.peaks.length > 0 ? "true" : "false"}
      data-cue-sec={deck.sourceKind === "file" ? String(deck.cueBeat) : undefined}
      data-pitch={deck.pitch.toFixed(2)}
      data-eq-high={String(deck.eq.high)}
      data-loop-active={deck.loop.active ? "true" : "false"}
      data-loop-mode={deck.loop.mode}
      data-slip={deck.slip ? "true" : "false"}
      data-key-lock={deck.keyLock ? "true" : "false"}
      data-key-sync={deck.keySync ? "true" : "false"}
      data-load-pending={loadPending ? "true" : "false"}
      data-loading={remoteBusy ? "true" : "false"}
      data-browse-source="remote"
      data-browse-key={browseKeyFilter ?? undefined}
      data-drop-active={dropActive ? "true" : "false"}
      data-midi={midiConnected ? "true" : "false"}
      style={deckStyle}
      aria-label={`Deck ${id.toUpperCase()}`}
    >
      <header className="cdj-deck-head">
        <div className="cdj-deck-identity">
          <span className="cdj-deck-num">{id.toUpperCase()}</span>
          <span className="cdj-deck-art" aria-hidden="true" />
          <div className="cdj-deck-titles">
            <strong>{deck.track.title}</strong>
            <span>{deck.track.artist}</span>
          </div>
          <button
            type="button"
            className="cdj-btn cdj-btn--load cdj-btn--eject"
            data-deck-load={id}
            data-pending={loadPending ? "true" : "false"}
            aria-label={`Carregar deck ${id.toUpperCase()}: ${loadTooltip}`}
            title={loadTooltip}
            disabled={libraryLoading}
            onClick={() => {
              onChange({ type: "requestDeckLoad", id });
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
            aria-label={`Arquivo de áudio do deck ${id.toUpperCase()}`}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) onFile(file);
            }}
          />
        </div>
        {onKeyMetricClick ? (
          <button
            type="button"
            className="cdj-deck-bpmkey"
            data-harmony={deck.harmony}
            data-filter-active={browseKeyFilter ? "true" : "false"}
            aria-label={`Tom ${deck.camelotLabel} ${deck.musicalKeyLabel}. Clique para filtrar a biblioteca por escala Camelot`}
            onClick={() => onKeyMetricClick()}
          >
            <span className="cdj-deck-bpmkey-bpm">{deck.effectiveBpm}</span>
            <span className="cdj-deck-bpmkey-key">
              <span className="cdj-deck-bpmkey-camelot">{deck.camelotLabel}</span>
              <span className="cdj-deck-bpmkey-musical">{deck.musicalKeyLabel}</span>
            </span>
          </button>
        ) : (
          <div className="cdj-deck-bpmkey" data-harmony={deck.harmony}>
            <span className="cdj-deck-bpmkey-bpm">{deck.effectiveBpm}</span>
            <span className="cdj-deck-bpmkey-key">
              <span className="cdj-deck-bpmkey-camelot">{deck.camelotLabel}</span>
              <span className="cdj-deck-bpmkey-musical">{deck.musicalKeyLabel}</span>
            </span>
          </div>
        )}
        <div className="cdj-deck-times">
          <span ref={remainRef} className="cdj-deck-time-remain">
            {formatDeckClock(remainingSec, true)}
          </span>
          <span ref={elapsedRef} className="cdj-deck-time-elapsed">
            {formatDeckClock(0)}
          </span>
        </div>
        <div className="cdj-deck-sync">
          <button
            type="button"
            className={`cdj-sync-btn${deck.keySync ? " is-on" : ""}`}
            aria-pressed={deck.keySync}
            aria-label={keySyncHint}
            onClick={() => onChange({ type: "toggleKeySync", id })}
          >
            KEY SYNC
          </button>
          <div className="cdj-key-nudge" role="group" aria-label={`Ajuste de tom deck ${id.toUpperCase()}`}>
            <button
              type="button"
              className="cdj-key-nudge-btn"
              aria-label={`Descer um semitom no deck ${id.toUpperCase()}`}
              onClick={() => onChange({ type: "nudgeKeyShift", id, direction: -1 })}
            >
              ‹
            </button>
            <span>{deck.keyLabel}</span>
            <button
              type="button"
              className="cdj-key-nudge-btn"
              aria-label={`Subir um semitom no deck ${id.toUpperCase()}`}
              onClick={() => onChange({ type: "nudgeKeyShift", id, direction: 1 })}
            >
              ›
            </button>
          </div>
          <button
            type="button"
            className={`cdj-sync-btn cdj-sync-btn--beat${deck.sync ? " is-on" : ""}`}
            aria-pressed={deck.sync}
            onClick={() => onChange({ type: "sync", id, value: !deck.sync })}
          >
            BEAT SYNC
          </button>
          <button
            type="button"
            className={`cdj-sync-btn cdj-sync-btn--master${deck.isMaster ? " is-on" : ""}`}
            aria-pressed={deck.isMaster}
            onClick={() => onChange({ type: "masterDeck", id })}
          >
            MASTER
          </button>
        </div>
      </header>
      <div className="cdj-deck-wave-wrap">
        {remoteCopy ? (
          <p className="cdj-remote-load" role={remoteLoad?.status === "error" ? "alert" : "status"}>
            <span>{remoteCopy}</span>
            {remoteLoad?.status === "error" ? (
              <button type="button" className="cdj-remote-retry" onClick={() => onRetryRemote?.()}>
                Tentar de novo
              </button>
            ) : null}
          </p>
        ) : null}
        <DeckWaveform
          id={id}
          variant="deck"
          phase={0}
          bpm={deck.bpm}
          durationSec={deck.durationSec}
          spinning={deck.playing}
          peaks={deck.peaks}
          waveformV10={deck.waveformV10}
          accentColor={deck.camelotColor}
          camelotKey={deck.track.key}
          masterVisibleBars={MASTER_VISIBLE_BARS}
        />
      </div>

      <div className="cdj-deck-performance">
        <div className="cdj-pads-block">
          <div className="cdj-pad-rail" aria-hidden="true">
            <span className="cdj-pad-rail-icon">▦</span>
            <span className="cdj-pad-rail-icon">▮▮▮</span>
          </div>
          <div className="cdj-pads-stack">
            <div className="cdj-pads" role="group" aria-label={`Hot cues deck ${id.toUpperCase()}`}>
              {Array.from({ length: HOT_CUE_SLOTS }, (_, index) => {
                const slot = index + 1;
                const cue = deck.hotCues.find((item) => item.slot === slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`cdj-performance-pad${cue?.set ? " is-set" : ""}`}
                    aria-label={`Hot cue ${PAD_LABELS[index]} deck ${id.toUpperCase()}`}
                    aria-pressed={Boolean(cue?.set)}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      onChange({ type: "hotCuePadPress", id, slot });
                    }}
                    onPointerUp={() => onChange({ type: "hotCuePadRelease", id, slot })}
                    onPointerCancel={() => onChange({ type: "hotCuePadRelease", id, slot })}
                  >
                    {PAD_LABELS[index]}
                  </button>
                );
              })}
            </div>
            <select className="cdj-pad-mode" disabled aria-label="Modo dos pads" value="hotcue">
              <option value="hotcue">HOT CUE</option>
            </select>
          </div>
        </div>

        <div className="cdj-deck-transport">
          <div className="cdj-loop-block" role="group" aria-label={`Loop deck ${id.toUpperCase()}`}>
            <button
              type="button"
              className={`cdj-loop-size${deck.loop.active ? " is-on" : ""}`}
              aria-label={`Loop de ${deck.loop.beats} beats no deck ${id.toUpperCase()}`}
              onClick={() => onChange({ type: "loopLengthPress", id })}
            >
              {formatLoopBeats(deck.loop.beats)}
            </button>
            <div className="cdj-loop-arrows">
              <button
                type="button"
                aria-label={`Encolher loop do deck ${id.toUpperCase()}`}
                onClick={() => onChange({ type: "loopHalve", id })}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label={`Dobrar loop do deck ${id.toUpperCase()}`}
                onClick={() => onChange({ type: "loopDouble", id })}
              >
                ›
              </button>
            </div>
            <div className="cdj-loop-modes">
              <button
                type="button"
                className={deck.loop.mode === "auto" ? "is-on" : ""}
                aria-pressed={deck.loop.mode === "auto"}
                aria-label={`Loop automático deck ${id.toUpperCase()}`}
                onClick={() => onChange({ type: "loopMode", id, value: "auto" })}
              >
                AU
              </button>
              <button
                type="button"
                className={deck.loop.mode === "manual" ? "is-on" : ""}
                aria-pressed={deck.loop.mode === "manual"}
                aria-label={`Loop manual deck ${id.toUpperCase()}`}
                onClick={() => onChange({ type: "loopMode", id, value: "manual" })}
              >
                MA
              </button>
            </div>
          </div>

          <div className="cdj-round-transport">
            <button
              className="cdj-btn cdj-btn--round cdj-btn--cue"
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
              className="cdj-btn cdj-btn--round cdj-btn--play"
              type="button"
              onClick={() => onChange({ type: "toggle", id })}
            >
              {deck.playing ? "Pause" : "Play"}
            </button>
          </div>

          <div className="cdj-jog-cluster">
            {pitchFader}
            <div className="cdj-jog-stack">
              <label className="cdj-jog-int">
                <span className="visually-hidden">Relógio do prato deck {id.toUpperCase()}</span>
                <select
                  aria-label={`Modo do prato deck ${id.toUpperCase()}`}
                  value={deck.jogMode === "vinyl" ? "vinyl" : "int"}
                  onChange={(event) =>
                    onChange({
                      type: "jogMode",
                      id,
                      value: event.currentTarget.value === "vinyl" ? "vinyl" : "cdj",
                    })
                  }
                >
                  <option value="int">INT</option>
                  <option value="vinyl">VINYL</option>
                </select>
              </label>
              <JogWheel
                id={id}
                mode={deck.jogMode}
                playing={deck.playing}
                bpm={deck.effectiveBpm}
                pitch={deck.pitch}
                onNudge={(direction) => onChange({ type: "nudge", id, direction })}
              />
            </div>
            <div className="cdj-jog-utils">
              <button
                type="button"
                className={`cdj-util-btn${deck.slip ? " is-on" : ""}`}
                aria-pressed={deck.slip}
                aria-label={`Slip deck ${id.toUpperCase()}`}
                onClick={() => onChange({ type: "toggleSlip", id })}
              >
                SLIP
              </button>
              <button
                type="button"
                className={`cdj-util-btn cdj-util-btn--q${deck.quantize ? " is-on" : ""}`}
                aria-pressed={deck.quantize}
                aria-label={`Quantize deck ${id.toUpperCase()}`}
                onClick={() => onChange({ type: "quantize", id, value: !deck.quantize })}
              >
                Q
              </button>
              <button
                type="button"
                className={`cdj-util-btn${deck.keyLock ? " is-on" : ""}`}
                aria-pressed={deck.keyLock}
                aria-label={`Master Tempo deck ${id.toUpperCase()}. Neste corte o botão só trava o rótulo, sem time-stretch`}
                onClick={() => onChange({ type: "toggleKeyLock", id })}
              >
                MT
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}, cdjDeckPropsEqual);

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

/**
 * Mostra o tamanho do auto loop sem casas quando o valor é inteiro.
 *
 * @param beats Duração armada ou ativa.
 */
function formatLoopBeats(beats: number): string {
  if (Number.isInteger(beats)) return String(beats);
  return beats.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

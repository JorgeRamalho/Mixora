import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RADIO_PLATFORM_STATION_TYPES } from "../../data/radio";
import { getCamelotKey } from "../../lib/musical-key";
import { syncBeginnerDjToStorage } from "../../lib/radio-catalog-import";
import { markBeginnerPlaylistLoaded } from "../../lib/radio-user-playlist";
import type { RadioClip } from "../../types/radio";
import type { PlatformId } from "../../types/platform";
import { RadioDigitalTuner, type RadioDisplayMode } from "./RadioDigitalTuner";
import { RadioPulseGrid } from "./RadioPulseGrid";

const SPECTRUM_BARS = 40;
const VU_SEGMENTS = 14;
const DROP_MS = 520;

type RadioVirtualDisplayProps = {
  clip?: RadioClip | null;
  accent: string;
  platformLabel: string;
  isPlaying: boolean;
  catalogReady: boolean;
  continuous: boolean;
  playbackLabel: string;
  playlistCount: number;
  playlistOnly: boolean;
  onPlaylistOnlyChange: (value: boolean) => void;
  onCatalogUpdated: () => void;
  stream?: ReactNode;
};

function platformCode(id?: PlatformId): string {
  if (!id) return "SYS";
  if (id === "youtube") return "YT";
  return id.slice(0, 3).toUpperCase();
}

export function RadioVirtualDisplay({
  clip,
  accent,
  platformLabel,
  isPlaying,
  catalogReady,
  continuous,
  playbackLabel,
  playlistCount,
  playlistOnly,
  onPlaylistOnlyChange,
  onCatalogUpdated,
  stream,
}: RadioVirtualDisplayProps) {
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [drop, setDrop] = useState(false);
  const [hint, setHint] = useState(true);
  const [displayMode, setDisplayMode] = useState<RadioDisplayMode>("chroma");
  const dropTimer = useRef(0);
  const beatMs = clip ? Math.round(60_000 / Math.max(clip.bpm, 1)) : 500;
  const camelot = clip?.key ? getCamelotKey(clip.key) : undefined;
  const keyColor = camelot?.color ?? accent;
  const live = isPlaying && catalogReady;

  useEffect(() => () => window.clearTimeout(dropTimer.current), []);

  const loadBeginnerPlaylist = async () => {
    setBusy(true);
    setStatusLine(null);
    try {
      const merged = await syncBeginnerDjToStorage();
      markBeginnerPlaylistLoaded();
      setStatusLine(`SYNC OK · ${merged.length} FAIXAS`);
      onCatalogUpdated();
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : "ERRO DE SYNC");
    } finally {
      setBusy(false);
    }
  };

  const onDrop = () => {
    setHint(false);
    setDrop(true);
    window.clearTimeout(dropTimer.current);
    dropTimer.current = window.setTimeout(() => setDrop(false), DROP_MS);
  };

  const marquee = clip
    ? `${clip.artist} — ${clip.title}    ${clip.artist} — ${clip.title}    `
    : "MAMUTE FM · AGUARDANDO SINAL";

  return (
    <div
      className="radio-hud"
      role="region"
      aria-label="Visor digital Mamute FM"
      data-playing={live ? "true" : "false"}
      data-drop={drop ? "true" : "false"}
      data-display-mode={displayMode}
      style={
        {
          "--hud-accent": accent,
          "--hud-key": keyColor,
          "--beat-ms": `${beatMs}ms`,
        } as CSSProperties
      }
    >
      <div className="radio-hud-bezel">
        <div className="radio-hud-bezel-top">
          <span className="radio-hud-brand">MAMUTE · NEXUS VISOR</span>
          <span className="radio-hud-chip">{platformCode(clip?.platform)}</span>
          {clip?.platform ? (
            <span className="radio-hud-station-type">
              {RADIO_PLATFORM_STATION_TYPES[clip.platform]}
            </span>
          ) : null}
          <span className="radio-hud-chroma" aria-hidden="true">
            INTERACTIVE
          </span>
          <span className="radio-hud-live" role="status">
            {live ? "AO VIVO" : catalogReady ? "STANDBY" : "SYNC"}
          </span>
        </div>

        <RadioDigitalTuner
          clip={clip}
          accent={accent}
          keyColor={keyColor}
          isPlaying={isPlaying}
          catalogReady={catalogReady}
          mode={displayMode}
          onModeChange={setDisplayMode}
        />

        <div className="radio-hud-screen">
          <div className="radio-hud-screen-inner" data-stream={stream ? "true" : "false"}>
            {stream ? <div className="radio-hud-stream">{stream}</div> : null}
            <RadioPulseGrid
              accent={accent}
              keyColor={keyColor}
              bpm={clip?.bpm ?? 124}
              playing={live}
              onDrop={onDrop}
            />
            <span className="radio-hud-scan" aria-hidden="true" />
            <span className="radio-hud-grid" aria-hidden="true" />
            <span className="radio-hud-aurora" aria-hidden="true" />
            <span className="radio-hud-glow" aria-hidden="true" />
            <span className="radio-hud-noise" aria-hidden="true" />

            <div className="radio-hud-vu radio-hud-vu--left" aria-hidden="true">
              {Array.from({ length: VU_SEGMENTS }, (_, i) => (
                <span
                  key={i}
                  className="radio-hud-vu-seg"
                  style={{ "--seg-i": i } as CSSProperties}
                />
              ))}
            </div>

            <div className="radio-hud-core">
              <div className="radio-hud-marquee" aria-live="polite">
                <span className="radio-hud-marquee-track">{marquee}</span>
              </div>

              <div className="radio-hud-metrics">
                <div className="radio-hud-metric">
                  <span className="radio-hud-metric-label">BPM</span>
                  <span className="radio-hud-metric-value">{clip?.bpm ?? "—"}</span>
                </div>
                <div className="radio-hud-metric radio-hud-metric--key">
                  <span className="radio-hud-metric-label">KEY</span>
                  <span className="radio-hud-metric-value">{camelot?.code ?? clip?.key ?? "—"}</span>
                </div>
                <div className="radio-hud-metric">
                  <span className="radio-hud-metric-label">GENRE</span>
                  <span className="radio-hud-metric-value">{clip?.genre ?? "—"}</span>
                </div>
                <div className="radio-hud-metric">
                  <span className="radio-hud-metric-label">TIME</span>
                  <span className="radio-hud-metric-value">{clip?.duration ?? "—"}</span>
                </div>
              </div>

              <p className="radio-hud-status">{playbackLabel}</p>
              {hint ? (
                <p className="radio-hud-pulse-hint">Toque o visor · arraste luz · clique para drop cromático</p>
              ) : null}
            </div>

            <div className="radio-hud-vu radio-hud-vu--right" aria-hidden="true">
              {Array.from({ length: VU_SEGMENTS }, (_, i) => (
                <span
                  key={i}
                  className="radio-hud-vu-seg"
                  style={{ "--seg-i": i } as CSSProperties}
                />
              ))}
            </div>
          </div>

          <div className="radio-hud-spectrum" aria-hidden="true">
            {Array.from({ length: SPECTRUM_BARS }, (_, index) => (
              <span
                key={index}
                className="radio-hud-spectrum-bar"
                style={{ "--bar-i": index } as CSSProperties}
              />
            ))}
          </div>
        </div>

        <div className="radio-hud-footer">
          <div className="radio-hud-footer-meta">
            <span>{platformLabel}</span>
            <span>{continuous ? "ALEATÓRIO · 24H" : "MANUAL"}</span>
            {statusLine ? <span className="radio-hud-footer-sync">{statusLine}</span> : null}
          </div>
          <div className="radio-hud-footer-actions">
            <button
              type="button"
              className="radio-hud-action"
              disabled={busy}
              onClick={() => void loadBeginnerPlaylist()}
            >
              {busy ? "SYNC…" : "DJ INICIANTE"}
            </button>
            <button
              type="button"
              className={playlistOnly ? "radio-hud-action is-on" : "radio-hud-action"}
              aria-pressed={playlistOnly}
              disabled={playlistCount === 0}
              onClick={() => onPlaylistOnlyChange(!playlistOnly)}
            >
              MINHA ({playlistCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type CSSProperties } from "react";
import type { RadioClip } from "../../types/radio";
import { getCamelotKey } from "../../lib/musical-key";

export type RadioDisplayMode = "chroma" | "vu" | "spectrum";

type RadioDigitalTunerProps = {
  clip?: RadioClip | null;
  accent: string;
  keyColor: string;
  isPlaying: boolean;
  catalogReady: boolean;
  mode: RadioDisplayMode;
  onModeChange: (mode: RadioDisplayMode) => void;
  compact?: boolean;
};

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function tunerFrequency(bpm: number): string {
  const base = 88 + (bpm % 20) * 0.1;
  return base.toFixed(1);
}

export function RadioDigitalTuner({
  clip,
  accent,
  keyColor,
  isPlaying,
  catalogReady,
  mode,
  onModeChange,
  compact = false,
}: RadioDigitalTunerProps) {
  const [clock, setClock] = useState(() => new Date());
  const camelot = clip?.key ? getCamelotKey(clip.key) : undefined;
  const live = isPlaying && catalogReady;
  const bpm = clip?.bpm ?? 128;

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const signalBars = live ? 5 : catalogReady ? 3 : 1;

  return (
    <div
      className={compact ? "radio-digital-tuner radio-digital-tuner--compact" : "radio-digital-tuner"}
      data-playing={live ? "true" : "false"}
      style={
        {
          "--tuner-accent": accent,
          "--tuner-key": keyColor,
        } as CSSProperties
      }
    >
      <div className="radio-digital-tuner-rail" aria-hidden="true">
        <span className="radio-digital-tuner-bracket" />
        <span className="radio-digital-tuner-bracket radio-digital-tuner-bracket--tr" />
        <span className="radio-digital-tuner-bracket radio-digital-tuner-bracket--bl" />
        <span className="radio-digital-tuner-bracket radio-digital-tuner-bracket--br" />
      </div>

      <header className="radio-digital-tuner-head">
        <div className="radio-digital-tuner-clock" aria-label="Horário da cabine">
          <span className="radio-digital-tuner-clock-label">CABINE</span>
          <time className="radio-digital-tuner-clock-value" dateTime={clock.toISOString()}>
            {pad2(clock.getHours())}:{pad2(clock.getMinutes())}:{pad2(clock.getSeconds())}
          </time>
        </div>

        <div className="radio-digital-tuner-freq" aria-label="Sintonia digital">
          <span className="radio-digital-tuner-freq-label">TUNER</span>
          <span className="radio-digital-tuner-freq-value">
            {tunerFrequency(bpm)}
            <small>FM</small>
          </span>
        </div>

        <div className="radio-digital-tuner-signal" aria-label="Intensidade do sinal">
          <span className="radio-digital-tuner-signal-label">SIG</span>
          <span className="radio-digital-tuner-signal-bars">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="radio-digital-tuner-signal-bar" data-on={i < signalBars ? "true" : "false"} />
            ))}
          </span>
        </div>
      </header>

      <div className="radio-digital-tuner-oled" role="group" aria-label="Mostrador da faixa">
        <p className="radio-digital-tuner-oled-kicker">
          <span className="radio-digital-tuner-mode-pill">RND</span>
          <span>{live ? "STREAM MP3 · AO VIVO" : catalogReady ? "STANDBY · PRONTO" : "SYNC · CATÁLOGO"}</span>
        </p>
        <h3 className="radio-digital-tuner-oled-title">{clip?.title ?? "MAMUTE FM"}</h3>
        <p className="radio-digital-tuner-oled-artist">{clip?.artist ?? "Aguardando sinal…"}</p>
        <div className="radio-digital-tuner-oled-meta">
          <span>
            BPM <strong>{bpm}</strong>
          </span>
          <span>
            KEY <strong>{camelot?.code ?? clip?.key ?? "—"}</strong>
          </span>
          <span>
            {clip?.genre ?? "ELECTRONIC"}
          </span>
        </div>
      </div>

      <div className="radio-digital-tuner-modes" role="tablist" aria-label="Modos do visor">
        {compact ? (
          <span className="radio-digital-tuner-mode-pill radio-digital-tuner-mode-pill--float">RND · MP3</span>
        ) : (
          (
            [
              ["chroma", "CHROMA"],
              ["vu", "VU"],
              ["spectrum", "SPEC"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              className={mode === id ? "radio-digital-tuner-mode is-on" : "radio-digital-tuner-mode"}
              onClick={() => onModeChange(id)}
            >
              {label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

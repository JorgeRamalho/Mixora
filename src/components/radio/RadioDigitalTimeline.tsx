import { useEffect, useState, type CSSProperties } from "react";
import { radioMp3Station } from "../../lib/radio-mp3-station";

type RadioDigitalTimelineProps = {
  accent: string;
  keyColor: string;
  playing: boolean;
  compact?: boolean;
};

function pad2(value: number): string {
  return Math.max(0, Math.floor(value)).toString().padStart(2, "0");
}

function formatDigitalTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${pad2(minutes)}:${pad2(secs)}`;
}

function isLiveDuration(duration: number): boolean {
  return !Number.isFinite(duration) || duration <= 0;
}

export function RadioDigitalTimeline({
  accent,
  keyColor,
  playing,
  compact = false,
}: RadioDigitalTimelineProps) {
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const live = isLiveDuration(duration);
  const progress = live ? 0 : duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  useEffect(() => {
    const audio = radioMp3Station.element;

    const sync = () => {
      setCurrent(audio.currentTime);
      setDuration(audio.duration);
    };

    sync();
    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("durationchange", sync);
    audio.addEventListener("loadedmetadata", sync);
    audio.addEventListener("seeking", sync);
    audio.addEventListener("seeked", sync);

    return () => {
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("durationchange", sync);
      audio.removeEventListener("loadedmetadata", sync);
      audio.removeEventListener("seeking", sync);
      audio.removeEventListener("seeked", sync);
    };
  }, []);

  const onSeek = (value: number) => {
    if (live) return;
    const audio = radioMp3Station.element;
    const next = (value / 100) * duration;
    audio.currentTime = next;
    setCurrent(next);
  };

  return (
    <div
      className={compact ? "radio-digital-timeline radio-digital-timeline--compact" : "radio-digital-timeline"}
      data-playing={playing ? "true" : "false"}
      data-live={live ? "true" : "false"}
      style={
        {
          "--timeline-accent": accent,
          "--timeline-key": keyColor,
          "--timeline-progress": `${progress}%`,
        } as CSSProperties
      }
      aria-label="Linha do tempo da faixa"
    >
      <div className="radio-digital-timeline-rail" aria-hidden="true">
        <span className="radio-digital-timeline-bracket" />
        <span className="radio-digital-timeline-bracket radio-digital-timeline-bracket--tr" />
      </div>

      <div className="radio-digital-timeline-readout">
        <div className="radio-digital-timeline-clock">
          <span className="radio-digital-timeline-label">POS</span>
          <time className="radio-digital-timeline-value">{formatDigitalTime(current)}</time>
        </div>
        <div className="radio-digital-timeline-track-wrap">
          <div className="radio-digital-timeline-track" aria-hidden="true">
            <span className="radio-digital-timeline-fill" />
            <span className="radio-digital-timeline-head" />
          </div>
          <input
            className="radio-digital-timeline-range"
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            disabled={live}
            aria-label={live ? "Stream ao vivo" : "Posição na faixa"}
            onChange={(event) => onSeek(Number(event.target.value))}
          />
        </div>
        <div className="radio-digital-timeline-clock radio-digital-timeline-clock--end">
          <span className="radio-digital-timeline-label">{live ? "SIG" : "DUR"}</span>
          <span className="radio-digital-timeline-value">
            {live ? (
              <>
                LIVE<span className="radio-digital-timeline-live-dot" aria-hidden="true" />
              </>
            ) : (
              formatDigitalTime(duration)
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

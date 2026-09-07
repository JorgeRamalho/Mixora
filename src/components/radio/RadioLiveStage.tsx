import { useEffect, useRef, type CSSProperties } from "react";
import { radioMp3Station } from "../../lib/radio-mp3-station";
import { RadioDigitalTimeline } from "./RadioDigitalTimeline";

type RadioLiveStageProps = {
  className?: string;
  accent?: string;
  keyColor?: string;
  playing?: boolean;
  compactTimeline?: boolean;
};

export function RadioLiveStage({
  className,
  accent = "var(--cyan)",
  keyColor = "var(--magenta)",
  playing = false,
  compactTimeline = false,
}: RadioLiveStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const el = radioMp3Station.element;
    el.className = className ? `radio-mp3-el ${className}` : "radio-mp3-el";
    host.appendChild(el);
    return () => {
      if (el.parentElement === host) host.removeChild(el);
    };
  }, [className]);

  return (
    <div
      className="radio-mp3-stage"
      style={
        {
          "--timeline-accent": accent,
          "--timeline-key": keyColor,
        } as CSSProperties
      }
    >
      <RadioDigitalTimeline
        accent={accent}
        keyColor={keyColor}
        playing={playing}
        compact={compactTimeline}
      />
      <div ref={hostRef} className="radio-mp3-host radio-mp3-host--engine" aria-hidden="true" />
    </div>
  );
}

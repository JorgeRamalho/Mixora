import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router";
import { PLATFORMS } from "../../data/platforms";
import { RADIO_PLATFORM_STATION_TYPES } from "../../data/radio";
import { getCamelotKey } from "../../lib/musical-key";
import { RadioFmEjectIcon, useRadioFmUi } from "../../lib/radio-fm-ui";
import { useRadioMp3 } from "../../lib/use-radio-mp3";
import type { PlatformId } from "../../types/platform";
import { RadioDigitalTuner } from "./RadioDigitalTuner";
import { RadioLiveStage } from "./RadioLiveStage";

const platformById = new Map(PLATFORMS.map((platform) => [platform.id, platform]));
const FM_SPECTRUM_BARS = 8;

function platformLabel(id: PlatformId): string {
  if (id === "youtube") return "YouTube";
  return platformById.get(id)?.name ?? id;
}

function isHomePath(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

function syncRadioFmReserve(el: HTMLElement | null): void {
  if (!el) {
    document.documentElement.style.setProperty("--radio-fm-reserve-h", "0px");
    document.documentElement.style.setProperty("--radio-fm-reserve-w", "0px");
    return;
  }
  const rect = el.getBoundingClientRect();
  const isNarrow = window.matchMedia("(max-width: 720px)").matches;
  const reserveH = Math.max(0, Math.ceil(window.innerHeight - rect.top));
  const reserveW = isNarrow
    ? 0
    : Math.max(0, Math.ceil(document.documentElement.clientWidth - rect.left));
  document.documentElement.style.setProperty("--radio-fm-reserve-h", `${reserveH}px`);
  document.documentElement.style.setProperty("--radio-fm-reserve-w", `${reserveW}px`);
}

type RadioFmBalloonProps = {
  variant?: "float" | "hero";
};

export function RadioFmBalloon({ variant = "float" }: RadioFmBalloonProps) {
  const rootRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const { shell, minimize, close, expand } = useRadioFmUi();
  const { clip, catalogReady, playing, start, pause, skip } = useRadioMp3();
  const isHero = variant === "hero";
  const floatDocked = variant === "float" && shell === "docked";
  const floatMini = variant === "float" && shell === "mini";
  const hidden =
    location.pathname === "/radio" ||
    floatDocked ||
    (variant === "float" && isHomePath(location.pathname));
  const onAir = playing;
  const platform = clip?.platform;
  const accent = platform ? (platformById.get(platform)?.accent ?? "#00e8ff") : "#00e8ff";
  const title = clip?.title ?? "Mamute FM";
  const artist = clip?.artist ?? "Sintonizando o flow…";
  const bpm = clip?.bpm ?? "—";
  const key = clip?.key ?? "—";
  const duration = clip?.duration ?? "LIVE";
  const genre = clip?.genre ?? "Electronic";
  const platformName = platform ? platformLabel(platform) : "Mamute";
  const sourceUrl = clip?.sourceUrl;
  const keyColor = clip?.key ? (getCamelotKey(clip.key)?.color ?? accent) : accent;
  const [displayMode, setDisplayMode] = useState<"chroma" | "vu" | "spectrum">("chroma");

  const ligar = useCallback(() => {
    void start();
  }, [start]);

  const togglePause = useCallback(() => {
    if (playing) {
      pause();
      return;
    }
    ligar();
  }, [ligar, pause, playing]);

  const handleSkip = useCallback(
    (delta: 1 | -1) => {
      void skip(delta);
    },
    [skip],
  );

  useEffect(() => {
    if (hidden || isHero || !clip) {
      syncRadioFmReserve(null);
      return;
    }

    const el = rootRef.current;
    if (!el) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => syncRadioFmReserve(el));
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", update);
      syncRadioFmReserve(null);
    };
  }, [hidden, isHero, clip, playing]);

  if (hidden) return null;
  if (!clip && !isHero) return null;

  if (floatMini) {
    return (
      <aside
        ref={rootRef}
        className="radio-fm-balloon"
        data-placement="float"
        data-shell="mini"
        data-on-air={onAir ? "true" : "false"}
        style={{ "--platform-accent": accent } as CSSProperties}
        aria-label="Mamute FM"
      >
        <button
          type="button"
          className="radio-fm-balloon-fab"
          onClick={expand}
          aria-label="Abrir Mamute FM"
          title="Abrir rádio"
        >
          <RadioFmEjectIcon />
        </button>
      </aside>
    );
  }

  return (
    <aside
      ref={rootRef}
      className={isHero ? "radio-fm-balloon radio-fm-balloon--hero" : "radio-fm-balloon"}
      data-placement={isHero ? "hero" : "float"}
      data-shell="expanded"
      data-on-air={onAir ? "true" : "false"}
      data-random="on"
      style={{ "--platform-accent": accent } as CSSProperties}
      aria-label="Mamute FM"
    >
      <div className="radio-fm-balloon-chassis">
        {!isHero ? (
          <div className="radio-fm-balloon-chrome" aria-label="Controles do visor">
            <button
              type="button"
              className="radio-fm-balloon-chrome-btn"
              onClick={minimize}
              aria-label="Minimizar rádio"
              title="Minimizar"
            >
              <span aria-hidden="true">−</span>
            </button>
            <button
              type="button"
              className="radio-fm-balloon-chrome-btn radio-fm-balloon-chrome-btn--close"
              onClick={close}
              aria-label="Fechar rádio"
              title="Fechar"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : null}
        <div className="radio-fm-balloon-player-host">
          <span className="radio-fm-balloon-viewport-label">NEXUS · STREAM MP3</span>
          <RadioDigitalTuner
            compact
            clip={clip}
            accent={accent}
            keyColor={keyColor}
            isPlaying={playing}
            catalogReady={catalogReady}
            mode={displayMode}
            onModeChange={setDisplayMode}
          />
          <RadioLiveStage
            className="radio-fm-balloon-frame"
            accent={accent}
            keyColor={keyColor}
            playing={playing && catalogReady}
            compactTimeline
          />
        </div>

        <div className="radio-fm-balloon-shell">
          <div className="radio-fm-balloon-panel">
            <header className="radio-fm-balloon-head">
              <div className="radio-fm-balloon-brand">
                <span className="radio-fm-balloon-brand-mark">MAMUTE</span>
                <span className="radio-fm-balloon-brand-fm">FM</span>
              </div>
              <div className="radio-fm-balloon-head-copy">
                <p className="radio-fm-balloon-kicker">
                  Rádio aleatória
                  {onAir ? (
                    <span className="radio-fm-balloon-live">AO VIVO</span>
                  ) : (
                    <span className="radio-fm-balloon-live radio-fm-balloon-live--idle">STANDBY</span>
                  )}
                </p>
                <h2 className="radio-fm-balloon-title">{title}</h2>
                <p className="radio-fm-balloon-artist">{artist}</p>
              </div>
              <span className="radio-fm-balloon-platform">{platformName}</span>
            </header>

            <div className="radio-fm-balloon-telemetry" aria-label="Telemetria da faixa">
              <div className="radio-fm-balloon-metric">
                <span className="radio-fm-balloon-metric-label">BPM</span>
                <span className="radio-fm-balloon-metric-value">{bpm}</span>
              </div>
              <div className="radio-fm-balloon-metric">
                <span className="radio-fm-balloon-metric-label">KEY</span>
                <span className="radio-fm-balloon-metric-value">{key}</span>
              </div>
              <div className="radio-fm-balloon-metric">
                <span className="radio-fm-balloon-metric-label">TIME</span>
                <span className="radio-fm-balloon-metric-value">{duration}</span>
              </div>
              <div className="radio-fm-balloon-metric">
                <span className="radio-fm-balloon-metric-label">GENRE</span>
                <span className="radio-fm-balloon-metric-value">{genre}</span>
              </div>
            </div>

            <div className="radio-fm-balloon-dial-wrap">
              <p className="radio-fm-balloon-dial-kicker">
                {onAir ? "Plataforma ao vivo" : "Próxima no flow"}
              </p>
              <div className="radio-fm-balloon-dial" aria-label="Plataforma no ar">
                <span
                  className="radio-fm-balloon-chip is-active"
                  data-platform={platform ?? "mamute"}
                  data-live={onAir ? "true" : "false"}
                  style={
                    {
                      "--platform-accent": (platform ? platformById.get(platform)?.accent : undefined) ?? accent,
                    } as CSSProperties
                  }
                  title={
                    platform
                      ? `${platformName} · ${RADIO_PLATFORM_STATION_TYPES[platform]}`
                      : platformName
                  }
                >
                  <span className="radio-fm-balloon-chip-name">{platformName}</span>
                  <span className="radio-fm-balloon-chip-type">
                    {onAir ? "AO VIVO" : platform ? RADIO_PLATFORM_STATION_TYPES[platform] : "STANDBY"}
                  </span>
                </span>
              </div>
            </div>

            <div className="radio-fm-balloon-spectrum" aria-hidden="true" data-on={onAir ? "true" : "false"}>
              {Array.from({ length: FM_SPECTRUM_BARS }, (_, index) => (
                <span
                  key={index}
                  className="radio-fm-balloon-spectrum-bar"
                  style={{ "--bar-i": index } as CSSProperties}
                />
              ))}
            </div>

            <div className="radio-fm-balloon-deck">
              <button type="button" className="radio-fm-balloon-deck-btn" onClick={() => handleSkip(-1)} aria-label="Faixa anterior">
                <span aria-hidden="true">⏮</span>
              </button>
              <button
                type="button"
                className="radio-fm-balloon-deck-btn radio-fm-balloon-deck-btn--primary"
                onClick={togglePause}
                aria-label={playing ? "Pausar rádio" : "Ligar rádio"}
              >
                {playing ? "Pausar" : "Ligar"}
              </button>
              <button type="button" className="radio-fm-balloon-deck-btn" onClick={() => handleSkip(1)} aria-label="Próxima faixa">
                <span aria-hidden="true">⏭</span>
              </button>
            </div>

            <footer className="radio-fm-balloon-footer">
              <p className="radio-fm-balloon-note">
                {catalogReady
                  ? `Aleatório · stream MP3 · ${platformName}.`
                  : "Sintonizando catálogo…"}
              </p>
              <div className="radio-fm-balloon-links">
                {sourceUrl ? (
                  <a href={sourceUrl} target="_blank" rel="noreferrer">
                    Na plataforma
                  </a>
                ) : null}
                <Link to="/radio">Cabine completa</Link>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </aside>
  );
}

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { NavLink } from "react-router";
import { PLATFORMS } from "../../data/platforms";
import type { PlatformId, PlatformIntel } from "../../types/platform";

const PAGE_SIZE = 3;
const DRAG_THRESHOLD = 18;
const AUTO_PLAY_MS = 3_600;
const AUTO_TILT_MS = 720;
const MANUAL_HOLD_MS = 5_000;

function platformById(id: PlatformId): PlatformIntel {
  return PLATFORMS.find((platform) => platform.id === id) ?? PLATFORMS[0]!;
}

function chunkPlatforms(items: PlatformIntel[], size: number): PlatformIntel[][] {
  const pages: PlatformIntel[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

function pageForPlatform(id: PlatformId, pages: PlatformIntel[][]): number {
  const index = pages.findIndex((page) => page.some((platform) => platform.id === id));
  return index >= 0 ? index : 0;
}

function platformIndex(id: PlatformId): number {
  const index = PLATFORMS.findIndex((platform) => platform.id === id);
  return index >= 0 ? index : 0;
}

function nextPlatformId(id: PlatformId, delta: number): PlatformId {
  const index = platformIndex(id);
  const next = (index + delta + PLATFORMS.length) % PLATFORMS.length;
  return PLATFORMS[next]!.id;
}

export function VisorTechSection() {
  const pages = useMemo(() => chunkPlatforms(PLATFORMS, PAGE_SIZE), []);
  const pageCount = pages.length;
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, pointerId: -1 });
  const manualTimerRef = useRef<number | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [activeId, setActiveId] = useState<PlatformId>("mamute");
  const [dragPx, setDragPx] = useState(0);
  const [dragTilt, setDragTilt] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hiddenPaused, setHiddenPaused] = useState(false);
  const [manualHold, setManualHold] = useState(false);
  const [autoTilt, setAutoTilt] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const loopActive = !reduceMotion && !hiddenPaused && !isDragging && !manualHold;
  const active = platformById(activeId);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onVisibility = () => setHiddenPaused(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    return () => {
      if (manualTimerRef.current !== null) {
        window.clearTimeout(manualTimerRef.current);
      }
    };
  }, []);

  const holdManualControl = useCallback(() => {
    setManualHold(true);
    if (manualTimerRef.current !== null) {
      window.clearTimeout(manualTimerRef.current);
    }
    manualTimerRef.current = window.setTimeout(() => {
      setManualHold(false);
      manualTimerRef.current = null;
    }, MANUAL_HOLD_MS);
  }, []);

  const applyPlatform = useCallback(
    (id: PlatformId) => {
      setActiveId(id);
      setPageIndex(pageForPlatform(id, pages));
    },
    [pages],
  );

  const applyPage = useCallback(
    (next: number) => {
      const clamped = ((next % pageCount) + pageCount) % pageCount;
      const first = pages[clamped]?.[0];
      if (first) applyPlatform(first.id);
      else setPageIndex(clamped);
    },
    [applyPlatform, pageCount, pages],
  );

  useEffect(() => {
    if (!loopActive) return;

    const advance = () => {
      setAutoTilt(16);
      window.setTimeout(() => setAutoTilt(0), AUTO_TILT_MS);
      setActiveId((current) => {
        const nextId = nextPlatformId(current, 1);
        setPageIndex(pageForPlatform(nextId, pages));
        return nextId;
      });
    };

    const timer = window.setInterval(advance, AUTO_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [loopActive, pages]);

  const goToPlatform = useCallback(
    (delta: number) => {
      holdManualControl();
      applyPlatform(nextPlatformId(activeId, delta));
    },
    [activeId, applyPlatform, holdManualControl],
  );

  const onCardSelect = useCallback(
    (id: PlatformId) => {
      holdManualControl();
      applyPlatform(id);
    },
    [applyPlatform, holdManualControl],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    holdManualControl();
    dragRef.current = { active: true, startX: event.clientX, pointerId: event.pointerId };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const width = sceneRef.current?.clientWidth ?? 640;
    const delta = event.clientX - dragRef.current.startX;
    const maxDrag = width * 0.38;
    const clamped = Math.min(maxDrag, Math.max(-maxDrag, delta));
    setDragPx(clamped);
    setDragTilt(Math.max(-12, Math.min(12, (clamped / Math.max(width, 320)) * 18)));
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const width = sceneRef.current?.clientWidth ?? 640;
    const dragPercent = (dragPx / Math.max(width, 320)) * 100;

    if (dragPercent <= -DRAG_THRESHOLD) {
      applyPage(pageIndex + 1);
    } else if (dragPercent >= DRAG_THRESHOLD) {
      applyPage(pageIndex - 1);
    }
    setDragPx(0);
    setDragTilt(0);
    setIsDragging(false);
  };

  const onCarouselKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToPlatform(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPlatform(-1);
    }
  };

  const activePlatformIndex = platformIndex(activeId);

  const prismStyle = {
    "--page-index": pageIndex,
    "--page-count": pageCount,
    "--drag-x": `${dragPx}px`,
    "--tilt-y": `${isDragging ? dragTilt : autoTilt}deg`,
    "--loop-duration": `${AUTO_PLAY_MS}ms`,
  } as CSSProperties;

  return (
    <section
      className="home-showcase visor-tech"
      id="tecnologias"
      aria-labelledby="visor-tech-title"
    >
      <div className="home-showcase-head">
        <p className="kicker">Integrações · visor HUD</p>
        <h2 id="visor-tech-title">Tecnologias no visor</h2>
        <p>
          MIXORA como player nativo da cabine, mais integrações reais — cada uma com limites
          publicados pelas próprias plataformas.
        </p>
      </div>

      <div
        className="visor-tech-carousel"
        data-autoplay={reduceMotion ? "off" : "on"}
        data-loop={loopActive ? "on" : "off"}
      >
        <div className="visor-tech-carousel-toolbar">
          <p className="visor-tech-carousel-status" aria-live="polite">
            <span className={loopActive ? "visor-tech-carousel-live is-on" : "visor-tech-carousel-live"}>
              {loopActive ? "Loop automático" : "Pausado"}
            </span>
            <span>
              {active.name} · {activePlatformIndex + 1} de {PLATFORMS.length}
            </span>
            <span className="visor-tech-carousel-block">
              Bloco {pageIndex + 1} de {pageCount}
            </span>
          </p>
          <div className="visor-tech-carousel-nav">
            <button
              type="button"
              className="visor-tech-carousel-btn"
              aria-label="Plataforma anterior no visor"
              onClick={() => goToPlatform(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="visor-tech-carousel-btn"
              aria-label="Próxima plataforma no visor"
              onClick={() => goToPlatform(1)}
            >
              ›
            </button>
          </div>
        </div>

        <div
          ref={sceneRef}
          className="visor-tech-carousel-scene"
          data-dragging={isDragging ? "true" : "false"}
          data-loop={loopActive ? "on" : "off"}
          role="region"
          aria-roledescription="carrossel"
          aria-label="Plataformas no visor, três por bloco"
          tabIndex={0}
          onKeyDown={onCarouselKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <div
            className={`visor-tech-carousel-prism${loopActive ? " is-autoplay-loop" : ""}${autoTilt !== 0 ? " is-auto-tilting" : ""}`}
            style={prismStyle}
          >
            {pages.map((pagePlatforms, faceIndex) => (
              <div
                key={faceIndex}
                className="visor-tech-carousel-face"
                aria-hidden={faceIndex !== pageIndex}
              >
                {pagePlatforms.map((platform) => {
                  const selected = platform.id === activeId;
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      className={
                        selected
                          ? "visor-tech-carousel-card is-active"
                          : "visor-tech-carousel-card"
                      }
                      style={{ "--card-accent": platform.accent } as CSSProperties}
                      aria-pressed={selected}
                      aria-label={`${platform.name} · ${platform.role}`}
                      onClick={() => onCardSelect(platform.id)}
                    >
                      <span className="visor-tech-carousel-card-dot" aria-hidden="true" />
                      <strong>{platform.name}</strong>
                      <span>{platform.role}</span>
                      <p>{platform.summary}</p>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="visor-tech-carousel-dots" role="tablist" aria-label="Plataformas no visor">
          {PLATFORMS.map((platform, index) => (
            <button
              key={platform.id}
              type="button"
              role="tab"
              className={platform.id === activeId ? "is-active" : undefined}
              aria-selected={platform.id === activeId}
              aria-label={`${platform.name} · plataforma ${index + 1} de ${PLATFORMS.length}`}
              style={{ "--dot-accent": platform.accent } as CSSProperties}
              onClick={() => {
                holdManualControl();
                applyPlatform(platform.id);
              }}
            />
          ))}
        </div>
      </div>

      <article
        className="card visor-tech-panel"
        id="visor-tech-panel"
        aria-labelledby={`visor-tab-${activeId}`}
        data-stage="10"
        style={{ "--panel-accent": active.accent } as CSSProperties}
      >
        <header className="visor-tech-panel-head">
          <p className="kicker" id={`visor-tab-${activeId}`}>
            {active.role}
          </p>
          <h3>{active.name}</h3>
        </header>
        <div className="visor-tech-panel-glow" aria-hidden="true" />
        <p className="visor-tech-summary">{active.summary}</p>

        <div className="visor-tech-columns">
          <div>
            <h4>O que entra</h4>
            <ul>
              {active.capabilities.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Limites</h4>
            <ul>
              {active.limits.slice(0, 2).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="visor-tech-footer">
          <NavLink className="btn" to={`/catalogo#${active.id}`}>
            Ver ficha completa
          </NavLink>
          {active.id === "mamute" ? (
            <NavLink className="btn btn-solid" to="/mixer">
              Abrir player nativo
            </NavLink>
          ) : null}
        </div>
      </article>
    </section>
  );
}

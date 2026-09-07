import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from "react";

const MAGENTA: Rgb = [255, 45, 149];
const RIPPLE_MS = 1400;
const TRAIL_MS = 520;

type Rgb = [number, number, number];

type Ripple = {
  x: number;
  y: number;
  born: number;
  mix: number;
};

type PointerSample = {
  x: number;
  y: number;
  born: number;
};

type RadioPulseGridProps = {
  accent: string;
  keyColor: string;
  bpm: number;
  playing: boolean;
  onDrop?: () => void;
};

function hexToRgb(hex: string): Rgb {
  const raw = hex.trim().replace("#", "");
  if (raw.length === 3) {
    return [
      Number.parseInt(raw[0]! + raw[0]!, 16),
      Number.parseInt(raw[1]! + raw[1]!, 16),
      Number.parseInt(raw[2]! + raw[2]!, 16),
    ];
  }
  if (raw.length >= 6) {
    return [
      Number.parseInt(raw.slice(0, 2), 16) || 0,
      Number.parseInt(raw.slice(2, 4), 16) || 0,
      Number.parseInt(raw.slice(4, 6), 16) || 0,
    ];
  }
  return [0, 232, 255];
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

function triad(a: Rgb, b: Rgb, c: Rgb, t: number): Rgb {
  const x = ((t % 1) + 1) % 1 * 3;
  if (x < 1) return mixRgb(a, b, x);
  if (x < 2) return mixRgb(b, c, x - 1);
  return mixRgb(c, a, x - 2);
}

function rgba(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function RadioPulseGrid({ accent, keyColor, bpm, playing, onDrop }: RadioPulseGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentRef = useRef(hexToRgb(accent));
  const keyRef = useRef(hexToRgb(keyColor));
  const bpmRef = useRef(Math.max(bpm, 60));
  const playingRef = useRef(playing);
  const chromaRef = useRef(0);
  const ripplesRef = useRef<Ripple[]>([]);
  const trailRef = useRef<PointerSample[]>([]);
  const pointerRef = useRef<{ x: number; y: number; inside: boolean }>({
    x: 0,
    y: 0,
    inside: false,
  });
  const onDropRef = useRef(onDrop);

  accentRef.current = hexToRgb(accent);
  keyRef.current = hexToRgb(keyColor);
  bpmRef.current = Math.max(bpm, 60);
  playingRef.current = playing;
  onDropRef.current = onDrop;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnDrop = (x: number, y: number) => {
      chromaRef.current = (chromaRef.current + 0.18) % 1;
      ripplesRef.current.push({
        x,
        y,
        born: performance.now(),
        mix: chromaRef.current,
      });
      if (ripplesRef.current.length > 8) ripplesRef.current.shift();
      onDropRef.current?.();
    };

    const draw = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const beatMs = 60_000 / bpmRef.current;
      const beat = (now / beatMs) % 1;
      const kick = 0.5 + 0.5 * Math.sin(beat * Math.PI * 2);
      const live = playingRef.current;
      const cell = w < 420 ? 13 : 15;
      const cols = Math.max(10, Math.floor(w / cell));
      const rows = Math.max(6, Math.floor(h / cell));
      const cw = w / cols;
      const ch = h / rows;
      const accentRgb = accentRef.current;
      const keyRgb = keyRef.current;
      const pointer = pointerRef.current;
      const ripples = ripplesRef.current.filter((ripple) => now - ripple.born < RIPPLE_MS);
      ripplesRef.current = ripples;
      const trail = trailRef.current.filter((sample) => now - sample.born < TRAIL_MS);
      trailRef.current = trail;

      const idle = live ? 0.22 : 0.14;
      const pulseGain = live ? 0.72 : 0.38;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const cx = (col + 0.5) * cw;
          const cy = (row + 0.5) * ch;
          const travel = ((col / cols) - beat + 1) % 1;
          const wavefront = Math.max(0, 1 - travel * 4.2) ** 2;
          const lattice = 0.5 + 0.5 * Math.sin(row * 0.55 + beat * Math.PI * 2);

          let near = 0;
          if (pointer.inside) {
            const d = Math.hypot(cx - pointer.x, cy - pointer.y);
            near = Math.max(0, 1 - d / 92) ** 2;
          }
          for (const sample of trail) {
            const age = 1 - (now - sample.born) / TRAIL_MS;
            const d = Math.hypot(cx - sample.x, cy - sample.y);
            near = Math.max(near, Math.max(0, 1 - d / 36) * age * 0.7);
          }

          let ring = 0;
          let ringMix = chromaRef.current;
          for (const ripple of ripples) {
            const elapsed = now - ripple.born;
            const radius = (elapsed / RIPPLE_MS) * Math.hypot(w, h) * 0.72;
            const d = Math.hypot(cx - ripple.x, cy - ripple.y);
            const band = 1 - Math.abs(d - radius) / 16;
            if (band > 0) {
              const fade = 1 - elapsed / RIPPLE_MS;
              ring = Math.max(ring, band * fade);
              ringMix = ripple.mix;
            }
          }

          const energy = idle + wavefront * pulseGain * (0.55 + lattice * 0.45) + near * 0.95 + ring * 1.15;
          if (energy < 0.08) continue;

          const tint = triad(accentRgb, keyRgb, MAGENTA, col / cols + chromaRef.current + ringMix * 0.25);
          const size = Math.min(cw, ch) * (0.28 + Math.min(energy, 1.4) * 0.38);
          ctx.fillStyle = rgba(tint, Math.min(0.95, 0.12 + energy * 0.55));
          ctx.beginPath();
          ctx.roundRect(cx - size / 2, cy - size / 2, size, size, 2);
          ctx.fill();

          if (energy > 0.85) {
            ctx.fillStyle = rgba(tint, 0.16 + kick * 0.08);
            ctx.beginPath();
            ctx.arc(cx, cy, size * 1.35, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.lineWidth = live ? 1.8 : 1.15;
      ctx.strokeStyle = rgba(mixRgb(accentRgb, MAGENTA, 0.35 + chromaRef.current * 0.4), live ? 0.85 : 0.5);
      ctx.beginPath();
      const mid = h * 0.46;
      for (let x = 0; x <= w; x += 3) {
        const phase = now / 180 + x * 0.045;
        const amp = (live ? 0.16 : 0.08) + kick * (live ? 0.06 : 0.03);
        const y = mid + Math.sin(phase) * h * amp + Math.sin(phase * 2.15 + 0.8) * h * amp * 0.32;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (!reduced.matches) {
        raf = window.requestAnimationFrame(draw);
      }
    };

    const onResize = () => {
      resize();
      if (reduced.matches) {
        draw(performance.now());
      }
    };

    resize();
    raf = window.requestAnimationFrame(draw);
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(canvas);

    const canvasEl = canvas;
    const localSpawn = spawnDrop;

    const toLocal = (event: PointerEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onMove = (event: PointerEvent) => {
      const { x, y } = toLocal(event);
      pointerRef.current = { x, y, inside: true };
      trailRef.current.push({ x, y, born: performance.now() });
      if (trailRef.current.length > 18) trailRef.current.shift();
    };

    const onDown = (event: PointerEvent) => {
      event.preventDefault();
      canvasEl.setPointerCapture(event.pointerId);
      const { x, y } = toLocal(event);
      pointerRef.current = { x, y, inside: true };
      localSpawn(x, y);
    };

    const onLeave = () => {
      pointerRef.current.inside = false;
    };

    canvasEl.addEventListener("pointermove", onMove);
    canvasEl.addEventListener("pointerdown", onDown);
    canvasEl.addEventListener("pointerleave", onLeave);
    canvasEl.addEventListener("pointercancel", onLeave);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      canvasEl.removeEventListener("pointermove", onMove);
      canvasEl.removeEventListener("pointerdown", onDown);
      canvasEl.removeEventListener("pointerleave", onLeave);
      canvasEl.removeEventListener("pointercancel", onLeave);
    };
  }, []);

  const dropAtCenter = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chromaRef.current = (chromaRef.current + 0.18) % 1;
    ripplesRef.current.push({
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight / 2,
      born: performance.now(),
      mix: chromaRef.current,
    });
    onDrop?.();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    dropAtCenter();
  };

  const onPointerDownCapture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.focus({ preventScroll: true });
  };

  return (
    <canvas
      ref={canvasRef}
      className="radio-hud-pulse"
      tabIndex={0}
      role="img"
      aria-label="Pulse grid do visor. Arraste para iluminar. Clique ou Enter para um drop de cor."
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDownCapture}
    />
  );
}

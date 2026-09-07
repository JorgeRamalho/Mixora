import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PLATFORMS } from "../../data/platforms";
import { visorBeatPhase, visorWaveFrame } from "../../lib/visor-motion";
import { bindVisorStage } from "../../lib/visor-stage";

const VU_BARS = 12;
const PHASE_STEPS = 32;
/** Envelope de uma frase 8 compassos — picos nos downbeats. */
const PHASE_ENVELOPE = [
  42, 58, 72, 100, 82, 60, 48, 86, 68, 54, 92, 100, 78, 56, 46, 84, 64, 52, 90, 98, 76, 58, 48, 88,
  70, 54, 94, 96, 74, 58, 42, 80,
] as const;

type DigitalVisorProps = {
  placement?: "hero" | "band";
};

export function DigitalVisor({ placement = "band" }: DigitalVisorProps) {
  const isHero = placement === "hero";
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clock, setClock] = useState(() => new Date().toISOString().slice(11, 19));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return bindVisorStage(root, { flat: true });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      const now = performance.now();
      const frame = visorWaveFrame(now);
      const pulse = 0.42 + 0.58 * Math.abs(Math.sin(visorBeatPhase(now) * Math.PI));
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(62, 232, 214, 0.08)";
      ctx.lineWidth = 1;
      for (let g = 0; g < 6; g += 1) {
        const y = (height / 6) * g;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const cyan = ctx.createLinearGradient(0, 0, width, 0);
      cyan.addColorStop(0, "rgba(62, 232, 214, 0.15)");
      cyan.addColorStop(0.45, `rgba(143, 245, 234, ${0.45 + 0.5 * pulse})`);
      cyan.addColorStop(1, "rgba(212, 196, 160, 0.75)");
      ctx.shadowBlur = 16 * pulse;
      ctx.shadowColor = "rgba(62, 232, 214, 0.75)";
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let x = 0; x < width; x += 1) {
        const wave =
          Math.sin((x + frame) * 0.035) * 14 + Math.sin((x + frame) * 0.09) * 7;
        const y = height / 2 + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const magenta = ctx.createLinearGradient(0, 0, width, 0);
      magenta.addColorStop(0, "rgba(232, 90, 168, 0.25)");
      magenta.addColorStop(0.55, `rgba(255, 142, 200, ${0.35 + 0.35 * pulse})`);
      magenta.addColorStop(1, "rgba(212, 196, 160, 0.5)");
      ctx.shadowColor = "rgba(232, 90, 168, 0.5)";
      ctx.strokeStyle = magenta;
      ctx.beginPath();
      for (let x = 0; x < width; x += 1) {
        const wave = Math.cos((x + frame * 1.4) * 0.05) * 9;
        const y = height / 2 + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const violet = ctx.createLinearGradient(0, 0, width, 0);
      violet.addColorStop(0, "rgba(139, 124, 255, 0.2)");
      violet.addColorStop(0.5, `rgba(196, 184, 255, ${0.28 + 0.32 * pulse})`);
      violet.addColorStop(1, "rgba(255, 45, 149, 0.4)");
      ctx.shadowColor = "rgba(139, 124, 255, 0.45)";
      ctx.strokeStyle = violet;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      for (let x = 0; x < width; x += 1) {
        const wave =
          Math.sin((x + frame * 0.72) * 0.022) * 18 + Math.cos((x - frame) * 0.07) * 6;
        const y = height / 2 + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    draw();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={isHero ? "visor-scene visor-scene--hero" : "visor-scene visor-scene--band"}>
      <aside
        ref={rootRef}
        className="visor"
        aria-label="Visor digital MIXORAPlayerDJ"
      >
        <div className="visor-space">
          <div className="visor-halo" aria-hidden="true" />
          <div className="visor-ring visor-ring-outer" aria-hidden="true" />
          <div className="visor-ring visor-ring-mid" aria-hidden="true" />
          <div className="visor-ring visor-ring-inner" aria-hidden="true" />

          <div className="visor-chassis">
            <div className="visor-bezel">
              <span>MIXORA OS 1.0</span>
              <span>SIGNAL LOCK</span>
              <span>{clock} UTC</span>
            </div>
            <div className="visor-screen">
              <div className="visor-metrics">
                <div className="metric" data-depth="1">
                  <small>DECK A</small>
                  <strong>124.00</strong>
                </div>
                <div className="metric" data-depth="2">
                  <small>DECK B</small>
                  <strong>128.00</strong>
                </div>
                <div className="metric" data-depth="3">
                  <small>KEY</small>
                  <strong>8A / 9A</strong>
                </div>
                <div className="metric" data-depth="4">
                  <small>HEADROOM</small>
                  <strong>-6.0 dB</strong>
                </div>
              </div>
              <div className="tech-orbit">
                {PLATFORMS.map((platform, index) => (
                  <span
                    className="tech-chip"
                    key={platform.id}
                    style={
                      {
                        "--chip": platform.accent,
                        "--orbit-i": String(index),
                      } as CSSProperties
                    }
                  >
                    {platform.name}
                  </span>
                ))}
              </div>
              <div className="visor-hud">
                <canvas ref={canvasRef} className="visor-canvas" aria-hidden="true" />
                <div className="visor-vu" aria-hidden="true">
                  {Array.from({ length: VU_BARS }, (_, index) => (
                    <span key={index} style={{ "--vu-i": String(index) } as CSSProperties} />
                  ))}
                </div>
              </div>
            </div>
            <div className="visor-phase" aria-hidden="true">
              <div className="visor-phase-readout">
                <span className="visor-phase-lock">
                  <span className="visor-phase-pip" />
                  PHASE LOCK
                </span>
                <span className="visor-phase-delta">Δ 4.00 BPM</span>
                <span className="visor-phase-bridge">8A → 9A</span>
              </div>
              <div className="visor-phase-well">
                <span className="visor-phase-post visor-phase-post-a" />
                <div className="visor-phase-field">
                  <div className="visor-phase-ticks">
                    {Array.from({ length: PHASE_STEPS }, (_, index) => (
                      <span
                        key={`tick-${index}`}
                        className={index % 4 === 0 ? "is-downbeat" : undefined}
                        style={{ "--i": String(index) } as CSSProperties}
                      />
                    ))}
                  </div>
                  <div className="visor-phase-filament" />
                  <span className="visor-phase-scan" />
                  <div className="visor-phase-prism">
                    <span className="visor-phase-facet" />
                  </div>
                  <div className="visor-phase-lattice">
                    {PHASE_ENVELOPE.map((height, index) => (
                      <span
                        key={`bar-${index}`}
                        style={
                          {
                            "--i": String(index),
                            "--h": String(height),
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                </div>
                <span className="visor-phase-post visor-phase-post-b" />
              </div>
            </div>
          </div>

          <div className="visor-floor" aria-hidden="true" />
        </div>
      </aside>
    </div>
  );
}

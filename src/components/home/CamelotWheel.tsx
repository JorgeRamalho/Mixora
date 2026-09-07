import { useCallback, useEffect, useId, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { bindCamelotStage } from "../../lib/camelot-stage";
import {
  CAMELOT_BY_CODE,
  CAMELOT_CLOCKWISE_HOURS,
  camelotRelation,
  getCamelotKey,
  neighborCamelot,
  parseCamelot,
} from "../../lib/musical-key";
import type { CamelotLetter } from "../../types/harmony";

const CX = 210;
const CY = 210;

interface RingBand {
  inner: number;
  outer: number;
}

const OUTER: RingBand = { inner: 128, outer: 196 };
const INNER: RingBand = { inner: 68, outer: 120 };
const GAP = 0.85;

function polar(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function annularPath(
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const outerStart = polar(outerR, startDeg);
  const outerEnd = polar(outerR, endDeg);
  const innerEnd = polar(innerR, endDeg);
  const innerStart = polar(innerR, startDeg);
  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 0 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 0 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function hourAngles(hour: number): { start: number; mid: number; end: number } {
  const mid = ((hour % 12) * 30) - 90;
  return { start: mid - 15 + GAP, mid, end: mid + 15 - GAP };
}

function sectorState(code: string, selected: string): "selected" | "related" | "idle" {
  const relation = camelotRelation(selected, code);
  switch (relation) {
    case "perfect":
      return "selected";
    case "relative":
    case "neighbor":
      return "related";
    case "diagonal":
    case "shift":
      return "idle";
    default: {
      const _never: never = relation;
      return _never;
    }
  }
}

function SectorLayer({
  letter,
  band,
  selected,
  onSelect,
  className,
}: {
  letter: CamelotLetter;
  band: RingBand;
  selected: string;
  onSelect: (code: string) => void;
  className: string;
}) {
  return (
    <svg className={className} viewBox="0 0 420 420">
      {CAMELOT_CLOCKWISE_HOURS.map((hour) => {
        const key = CAMELOT_BY_CODE[`${hour}${letter}`];
        if (!key) return null;
        const angles = hourAngles(hour);
        const labelR = (band.inner + band.outer) / 2;
        const label = polar(labelR, angles.mid);
        const state = sectorState(key.code, selected);
        return (
          <g key={key.code}>
            <path
              className="camelot-sector"
              d={annularPath(band.inner, band.outer, angles.start, angles.end)}
              style={{ "--sector-color": key.color } as CSSProperties}
              data-ring={letter}
              data-state={state}
              role="radio"
              aria-checked={state === "selected"}
              aria-label={`${key.code} · ${key.namePt} (${key.nameIntl})`}
              tabIndex={-1}
              onClick={() => onSelect(key.code)}
            />
            <text
              className="camelot-sector-code"
              x={label.x}
              y={label.y - 6}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {key.code}
            </text>
            <text
              className="camelot-sector-name"
              x={label.x}
              y={label.y + 10}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {key.nameIntl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface CamelotWheelProps {
  selected: string;
  onSelect: (code: string) => void;
}

export function CamelotWheel({ selected, onSelect }: CamelotWheelProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const glowId = `${uid}-hub-glow`;
  const active = getCamelotKey(selected) ?? CAMELOT_BY_CODE["8A"]!;

  useEffect(() => {
    const root = sceneRef.current;
    if (!root) return;
    return bindCamelotStage(root);
  }, []);

  const onWheelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const parsed = parseCamelot(selected);
      if (!parsed) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = neighborCamelot(selected, 1);
        if (next) onSelect(next);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const next = neighborCamelot(selected, -1);
        if (next) onSelect(next);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onSelect(`${parsed.hour}B`);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        onSelect(`${parsed.hour}A`);
      }
    },
    [onSelect, selected],
  );

  return (
    <div
      ref={sceneRef}
      className="camelot-scene"
      style={{ "--key-color": active.color } as CSSProperties}
    >
      <div className="camelot-chassis">
        <p className="camelot-telemetry">
          <span>Holo-deck</span>
          <span>Camelot OS</span>
          <span>Vector lock</span>
        </p>

        <div
          className="camelot-gyro"
          role="radiogroup"
          aria-label="Roda Camelot de tons maiores e menores"
          tabIndex={0}
          onKeyDown={onWheelKeyDown}
        >
          <span className="camelot-halo" aria-hidden="true" />
          <span className="camelot-orbit camelot-orbit-outer" aria-hidden="true" />
          <span className="camelot-orbit camelot-orbit-mid" aria-hidden="true" />
          <span className="camelot-orbit camelot-orbit-inner" aria-hidden="true" />

          <div className="camelot-rig">
            <span className="camelot-floor" aria-hidden="true" />
            <span className="camelot-core-side" aria-hidden="true" />

            <SectorLayer
              letter="B"
              band={OUTER}
              selected={selected}
              onSelect={onSelect}
              className="camelot-layer camelot-layer-b"
            />
            <SectorLayer
              letter="A"
              band={INNER}
              selected={selected}
              onSelect={onSelect}
              className="camelot-layer camelot-layer-a"
            />

            <svg className="camelot-layer camelot-layer-hub" viewBox="0 0 420 420" aria-hidden="true">
              <defs>
                <radialGradient id={glowId} cx="50%" cy="38%" r="70%">
                  <stop offset="0%" stopColor={active.color} stopOpacity="0.7" />
                  <stop offset="72%" stopColor="#070910" stopOpacity="0.96" />
                </radialGradient>
              </defs>
              <circle className="camelot-hub-ring" cx={CX} cy={CY} r="62" />
              <circle className="camelot-hub-fill" cx={CX} cy={CY} r="58" fill={`url(#${glowId})`} />
              <text className="camelot-hub-code" x={CX} y={CY - 6} textAnchor="middle">
                {active.code}
              </text>
              <text className="camelot-hub-mode" x={CX} y={CY + 16} textAnchor="middle">
                {active.mode}
              </text>
            </svg>

            <span className="camelot-glass" aria-hidden="true" />
          </div>
        </div>
      </div>

      <p className="camelot-wheel-legend">
        <span data-ring="B">B · maior · camada alta</span>
        <span data-ring="A">A · menor · camada baixa</span>
        <span>Giro 3D · setas navegam</span>
      </p>
    </div>
  );
}

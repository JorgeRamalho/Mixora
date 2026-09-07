import { useState, type CSSProperties } from "react";
import { RADIO_EQ_BANDS } from "../../data/radio";
import type { RadioEqBandId, RadioEqLevels } from "../../types/radio";

const DEFAULT_EQ: RadioEqLevels = {
  sub: 0.52,
  low: 0.5,
  mid: 0.48,
  high: 0.54,
  air: 0.5,
};

type RadioEqStripProps = {
  accent: string;
  onEqChange?: (levels: RadioEqLevels) => void;
};

export function RadioEqStrip({ accent, onEqChange }: RadioEqStripProps) {
  const [eq, setEq] = useState<RadioEqLevels>(DEFAULT_EQ);

  const setBand = (id: RadioEqBandId, value: number) => {
    setEq((current) => {
      const next = { ...current, [id]: value };
      onEqChange?.(next);
      return next;
    });
  };

  return (
    <div
      className="radio-dj-eq-strip"
      role="group"
      aria-label="Equalizador de cabine"
      style={{ "--eq-accent": accent } as CSSProperties}
    >
      <p className="radio-dj-eq-label">EQ · cabine</p>
      <div className="radio-dj-eq-bands">
        {RADIO_EQ_BANDS.map((band) => (
          <label key={band.id} className="radio-dj-eq-band">
            <span className="radio-dj-eq-band-label">{band.label}</span>
            <span className="radio-dj-eq-band-hz">{band.hz}</span>
            <div className="radio-eq-fader">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={eq[band.id]}
                aria-label={`${band.label} ${band.hz}`}
                onChange={(event) => setBand(band.id, Number(event.target.value))}
                style={{ "--eq-level": eq[band.id] } as CSSProperties}
              />
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

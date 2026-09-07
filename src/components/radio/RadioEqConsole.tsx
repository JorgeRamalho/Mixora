import { useState, type CSSProperties } from "react";
import { RADIO_EQ_BANDS } from "../../data/radio";
import type { RadioEqBandId, RadioEqLevels } from "../../types/radio";

const SPECTRUM_BARS = 16;
const DEFAULT_EQ: RadioEqLevels = {
  sub: 0.52,
  low: 0.5,
  mid: 0.48,
  high: 0.54,
  air: 0.5,
};

type RadioEqConsoleProps = {
  accent: string;
  compact?: boolean;
  onEqChange?: (levels: RadioEqLevels) => void;
};

export function RadioEqConsole({ accent, compact = false, onEqChange }: RadioEqConsoleProps) {
  const [eq, setEq] = useState<RadioEqLevels>(DEFAULT_EQ);

  const setBand = (id: RadioEqBandId, value: number) => {
    setEq((current) => {
      const next = { ...current, [id]: value };
      onEqChange?.(next);
      return next;
    });
  };

  return (
    <section
      className={compact ? "radio-eq-console radio-eq-console--compact" : "radio-eq-console"}
      aria-label="Equalizador Mamute FM"
    >
      {!compact ? (
        <header className="radio-eq-head">
          <div>
            <p className="kicker">Cabine · Mamute FM</p>
            <h2 className="radio-eq-title">Equalizador</h2>
          </div>
          <div className="radio-eq-status" role="status">
            <span className="radio-eq-live">NO AR</span>
          </div>
        </header>
      ) : (
        <p className="radio-eq-compact-label">EQ · cabine</p>
      )}

      <div className={compact ? "radio-eq-chassis radio-eq-chassis--compact" : "radio-eq-chassis"}>
        {!compact ? (
          <div
            className="radio-visor"
            aria-hidden="true"
            style={{ "--visor-accent": accent } as CSSProperties}
          >
            <div className="radio-visor-frame">
              <span className="radio-visor-scan" />
              <span className="radio-visor-grid" />
              <span className="radio-visor-glow" />
            </div>
          </div>
        ) : null}

        <div className="radio-tuner-eq" role="group" aria-label="Equalizador de cinco bandas">
          {!compact ? <p className="radio-tuner-eq-title">EQ · cabine</p> : null}
          <div className="radio-tuner-eq-bands">
            {RADIO_EQ_BANDS.map((band) => (
              <label key={band.id} className="radio-eq-band">
                <span className="radio-eq-band-label">{band.label}</span>
                <span className="radio-eq-band-hz">{band.hz}</span>
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

        <div className="radio-tuner-spectrum" aria-hidden="true">
          {Array.from({ length: SPECTRUM_BARS }, (_, index) => (
            <span
              key={index}
              className="radio-tuner-spectrum-bar"
              style={
                {
                  "--bar-i": index,
                  "--eq-mix": (eq.mid + eq.high) / 2,
                  "--bar-accent": accent,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

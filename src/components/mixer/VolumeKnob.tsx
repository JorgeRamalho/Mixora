import { RotaryKnob } from "./RotaryKnob";

export type VolumeKnobTone = "master" | "booth" | "cue";

export function VolumeKnob({
  label,
  value,
  onChange,
  ariaLabel,
  tone = "master",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  tone?: VolumeKnobTone;
}) {
  return (
    <RotaryKnob
      label={label}
      value={value}
      min={0}
      max={1}
      step={0.01}
      onChange={onChange}
      ariaLabel={ariaLabel}
      toneClass={`mixer-vol-knob--${tone}`}
      formatValue={(next) => `${Math.round(next * 100)}%`}
    />
  );
}

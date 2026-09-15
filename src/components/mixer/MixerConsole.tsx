import type { CSSProperties } from "react";
import { crossfaderSliderStyle } from "../../lib/range-slider-style";
import { mixerStagePaletteCssVars, resolveMixerStagePalette } from "../../lib/mixer-stage-palette";
import type { DeckId, MixerAction, MixerSnapshot } from "../../types/mixer";
import { RotaryKnob } from "./RotaryKnob";
import { formatKnobPercent } from "./rotary-knob-scale";
import { VolumeKnob } from "./VolumeKnob";

const EQ_BANDS = [
  { id: "high", label: "HIGH" },
  { id: "mid", label: "MID" },
  { id: "low", label: "LOW" },
] as const;

const EQ_MIN = -24;
const EQ_MAX = 12;
const EQ_STEP = 1;

/**
 * Knob de uma banda do EQ do canal, com rótulo curto no estilo Rekordbox.
 *
 * @param deckId Canal A ou B.
 * @param band Identificador high, mid ou low no snapshot.
 * @param label Texto visível HIGH, MID ou LOW.
 * @param value Ganho atual da banda em dB.
 * @param onChange Despacha a ação de EQ.
 */
function EqBand({
  deckId,
  band,
  label,
  value,
  onChange,
}: {
  deckId: DeckId;
  band: (typeof EQ_BANDS)[number]["id"];
  label: string;
  value: number;
  onChange: (action: MixerAction) => void;
}) {
  const channel = deckId.toUpperCase();

  return (
    <div className="mixer-eq-band">
      <p className="mixer-eq-band-label">{label}</p>
      <div className="mixer-eq-band-row mixer-eq-band-row--solo">
        <RotaryKnob
          hideLabel
          label={label}
          value={value}
          min={EQ_MIN}
          max={EQ_MAX}
          step={EQ_STEP}
          ariaLabel={`${label} canal ${channel}`}
          toneClass="mixer-vol-knob--eq"
          formatValue={(next) => formatKnobPercent(next, EQ_MIN, EQ_MAX)}
          onChange={(next) => onChange({ type: "eq", id: deckId, band, value: next })}
        />
      </div>
    </div>
  );
}

/**
 * Tira de um canal no mixer central, com TRIM, EQ, FILTER, CUE e fader.
 *
 * @param deckId Canal A ou B.
 * @param snap Snapshot atual da cabine.
 * @param onChange Despacha ações de trim, EQ, filter, cue e ganho.
 */
function ChannelStrip({
  deckId,
  snap,
  onChange,
}: {
  deckId: DeckId;
  snap: MixerSnapshot;
  onChange: (action: MixerAction) => void;
}) {
  const deck = snap[deckId];
  const channel = deckId.toUpperCase();

  return (
    <div className="mixer-eq-channel" data-channel={deckId}>
      <div className="mixer-eq-channel-knobs">
        <RotaryKnob
          label="TRIM"
          value={deck.trim}
          min={0.2}
          max={1}
          step={0.01}
          ariaLabel={`Trim deck ${channel}`}
          toneClass="mixer-vol-knob--trim"
          formatValue={(next) => formatKnobPercent(next, 0.2, 1)}
          onChange={(value) => onChange({ type: "trim", id: deckId, value })}
        />
        {EQ_BANDS.map((item) => (
          <EqBand
            key={item.id}
            deckId={deckId}
            band={item.id}
            label={item.label}
            value={deck.eq[item.id]}
            onChange={onChange}
          />
        ))}
        <div className="mixer-eq-band mixer-eq-filter">
          <p className="mixer-eq-band-label">FILTER</p>
          <div className="mixer-eq-band-row mixer-eq-band-row--solo">
            <RotaryKnob
              hideLabel
              label="FILTER"
              value={deck.filter}
              min={-100}
              max={100}
              step={1}
              ariaLabel={`Filter deck ${channel}`}
              toneClass="mixer-vol-knob--filter"
              formatValue={(next) => formatKnobPercent(next, -100, 100)}
              onChange={(value) => onChange({ type: "filter", id: deckId, value })}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        className={`mixer-pfl${deck.cueMonitor ? " is-on" : ""}`}
        aria-pressed={deck.cueMonitor}
        aria-label={`Cue monitor deck ${channel}`}
        onClick={() => onChange({ type: "toggleCueMonitor", id: deckId })}
      >
        CUE
      </button>
    </div>
  );
}

/**
 * Fader vertical de um canal, no mesmo molde Rekordbox da tira.
 *
 * @param deckId Canal A ou B.
 * @param value Ganho do canal, de 0 a 1.
 * @param onChange Despacha o novo ganho.
 */
function ChannelFader({
  deckId,
  value,
  onChange,
}: {
  deckId: DeckId;
  value: number;
  onChange: (action: MixerAction) => void;
}) {
  const channel = deckId.toUpperCase();
  return (
    <label className="mixer-fader" data-deck={deckId}>
      <span className="visually-hidden">Volume canal {channel}</span>
      <input
        type="range"
        min={0}
        max={1}
        step="any"
        value={value}
        style={crossfaderSliderStyle(value)}
        aria-label={`Volume deck ${channel}`}
        onChange={(event) =>
          onChange({ type: "gain", id: deckId, value: Number(event.currentTarget.value) })
        }
      />
    </label>
  );
}

/**
 * Mixer central compacto no molde Rekordbox, com tiras de canal, MIX/LEVEL e crossfader.
 *
 * @param snap Snapshot da cabine.
 * @param onChange Despacha trim, EQ, filter, cue, ganho, fone e crossfader.
 */
export function MixerConsole({
  snap,
  onChange,
}: {
  snap: MixerSnapshot;
  onChange: (action: MixerAction) => void;
}) {
  const consoleStyle = mixerStagePaletteCssVars(
    resolveMixerStagePalette({
      keyA: snap.a.track.key,
      keyB: snap.b.track.key,
      playingA: snap.a.playing,
      playingB: snap.b.playing,
      crossfader: snap.crossfader,
    }),
  ) as CSSProperties;

  return (
    <section className="mixer-console" style={consoleStyle} aria-label="Mixer central">
      <div className="mixer-eq-rack" role="group" aria-label="Equalizador de 3 bandas">
        <div className="mixer-eq-split">
          <ChannelFader deckId="a" value={snap.a.gain} onChange={onChange} />
          <ChannelStrip deckId="a" snap={snap} onChange={onChange} />
          <ChannelStrip deckId="b" snap={snap} onChange={onChange} />
          <ChannelFader deckId="b" value={snap.b.gain} onChange={onChange} />
        </div>
      </div>

      {/*
        Os faders usam `step="any"` porque recebem 14 bits da DDJ-400, e um step
        numérico alinharia o valor ao múltiplo do browser. Os faders ficam nas
        extremidades e os knobs do EQ no centro. MIX, LEVEL e MASTER CUE ficam
        abaixo do crossfader.
      */}

      <div className="mixer-xf-block">
        <p className="mixer-xf-label">CROSSFADER</p>
        <input
          className="mixer-xfader"
          type="range"
          min={0}
          max={1}
          step="any"
          value={snap.crossfader}
          style={crossfaderSliderStyle(snap.crossfader)}
          data-xf={snap.crossfader}
          aria-label="Crossfader"
          onChange={(event) => onChange({ type: "xf", value: Number(event.currentTarget.value) })}
        />
        <div className="mixer-xf-curve" aria-hidden="true">
          <span>A</span>
          <span>B</span>
        </div>
      </div>

      <div
        className="mixer-monitor-knobs mixer-monitor-knobs--hero"
        role="group"
        aria-label="Mix e level do fone"
      >
        <VolumeKnob
          label="MIX"
          tone="cue"
          value={snap.cueMix}
          ariaLabel="Cue mix headphone"
          onChange={(value) => onChange({ type: "cueMix", value })}
        />
        <VolumeKnob
          label="LEVEL"
          tone="booth"
          value={snap.booth}
          ariaLabel="Level headphone"
          onChange={(value) => onChange({ type: "booth", value })}
        />
        <button
          type="button"
          className={`mixer-master-cue${snap.masterCue ? " is-on" : ""}`}
          aria-pressed={snap.masterCue}
          aria-label="Master cue headphone"
          onClick={() => onChange({ type: "toggleMasterCue" })}
        >
          MASTER CUE
        </button>
      </div>
    </section>
  );
}

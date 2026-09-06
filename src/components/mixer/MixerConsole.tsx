import type { CSSProperties } from "react";
import { crossfaderSliderStyle } from "../../lib/range-slider-style";
import { getCamelotKey } from "../../lib/musical-key";
import type { DeckId, MixerAction, MixerSnapshot } from "../../types/mixer";
import { RotaryKnob } from "./RotaryKnob";
import { formatKnobPercent } from "./rotary-knob-scale";
import { VolumeKnob } from "./VolumeKnob";

const EQ_BANDS = [
  { id: "high", label: "HIGH" },
  { id: "mid", label: "MED" },
  { id: "low", label: "LOW" },
] as const;

const EQ_MIN = -24;
const EQ_MAX = 12;
const EQ_STEP = 1;

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

function ChannelEq({
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
      <p className="mixer-eq-channel-label">CH {channel}</p>
      <div className="mixer-channel-pre">
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
      </div>
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
  );
}

export function MixerConsole({
  snap,
  onChange,
}: {
  snap: MixerSnapshot;
  onChange: (action: MixerAction) => void;
}) {
  const camelotA = getCamelotKey(snap.a.track.key)?.color ?? "#8b8fa8";
  const camelotB = getCamelotKey(snap.b.track.key)?.color ?? "#8b8fa8";
  const consoleStyle = {
    "--camelot-a": camelotA,
    "--camelot-b": camelotB,
  } as CSSProperties;

  return (
    <section className="mixer-console" style={consoleStyle} aria-label="Mixer central">
      <header className="mixer-console-head">
        <p className="kicker">Mamute · DJM-V10</p>
        <h2 className="mixer-console-title">Mixer &amp; EQ</h2>
      </header>

      <div className="mixer-monitor-knobs mixer-monitor-knobs--hero" role="group" aria-label="Master, booth e cue mix">
        <p className="mixer-monitor-knobs-label">OUTPUT · MONITOR</p>
        <VolumeKnob
          label="MASTER"
          tone="master"
          value={snap.master}
          ariaLabel="Volume master"
          onChange={(value) => onChange({ type: "master", value })}
        />
        <VolumeKnob
          label="BOOTH"
          tone="booth"
          value={snap.booth}
          ariaLabel="Volume booth"
          onChange={(value) => onChange({ type: "booth", value })}
        />
        <VolumeKnob
          label="CUE MIX"
          tone="cue"
          value={snap.cueMix}
          ariaLabel="Cue mix headphone digital"
          onChange={(value) => onChange({ type: "cueMix", value })}
        />
        <button
          type="button"
          className={`mixer-master-cue${snap.masterCue ? " is-on" : ""}`}
          aria-pressed={snap.masterCue}
          aria-label="Master cue no fone digital"
          onClick={() => onChange({ type: "toggleMasterCue" })}
        >
          MASTER CUE
        </button>
      </div>

      <div className="mixer-eq-rack" role="group" aria-label="Equalizador de 3 bandas">
        <p className="mixer-eq-rack-label">EQ · HIGH / MED / LOW</p>
        <div className="mixer-eq-split">
          <ChannelEq deckId="a" snap={snap} onChange={onChange} />
          <ChannelEq deckId="b" snap={snap} onChange={onChange} />
        </div>
      </div>

      {/*
        O PFL de canal nasceu com o transporte MIDI: o botão CUE da deck passou
        a ser set e call do ponto de cue, como num CDJ, e por isso o monitor de
        fone precisava de alvo próprio aqui, ao lado dos faders.
      */}
      <div className="mixer-pfl-row" role="group" aria-label="Cue de canal">
        {(["a", "b"] as const).map((deckId) => (
          <button
            key={deckId}
            type="button"
            className={`mixer-pfl${snap[deckId].cueMonitor ? " is-on" : ""}`}
            aria-pressed={snap[deckId].cueMonitor}
            aria-label={`Cue monitor deck ${deckId.toUpperCase()}`}
            onClick={() => onChange({ type: "toggleCueMonitor", id: deckId })}
          >
            CUE {deckId.toUpperCase()}
          </button>
        ))}
      </div>

      {/*
        Os três faders usam `step="any"` porque eles recebem valor de 14 bits da
        DDJ-400, e um step numérico faria o browser alinhar o valor ao múltiplo
        mais próximo, jogando fora a resolução do par MSB/LSB. As setas do
        teclado continuam andando 1% do curso, que é o passo padrão do range.
      */}
      <div className="mixer-faders">
        <label className="mixer-fader" data-deck="a">
          <span>CH A</span>
          <input
            type="range"
            min={0}
            max={1}
            step="any"
            value={snap.a.gain}
            style={crossfaderSliderStyle(snap.a.gain)}
            aria-label="Volume deck A"
            onChange={(event) => onChange({ type: "gain", id: "a", value: Number(event.target.value) })}
          />
        </label>
        <label className="mixer-fader" data-deck="b">
          <span>CH B</span>
          <input
            type="range"
            min={0}
            max={1}
            step="any"
            value={snap.b.gain}
            style={crossfaderSliderStyle(snap.b.gain)}
            aria-label="Volume deck B"
            onChange={(event) => onChange({ type: "gain", id: "b", value: Number(event.target.value) })}
          />
        </label>
      </div>

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
          onChange={(event) => onChange({ type: "xf", value: Number(event.target.value) })}
        />
        <div className="mixer-xf-curve" aria-hidden="true">
          <span>A</span>
          <span>B</span>
        </div>
      </div>
    </section>
  );
}

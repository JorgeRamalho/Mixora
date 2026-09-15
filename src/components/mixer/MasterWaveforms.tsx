import { memo, useCallback } from "react";
import {
  masterWaveDeckViewEqual,
  selectMasterWaveDeckView,
} from "../../lib/mixer-component-selectors";
import { useMixerSelector } from "../../lib/use-mixer-selector";
import { MASTER_VISIBLE_BARS } from "../../lib/waveform-view-window";
import type { DeckId } from "../../types/mixer";
import { DeckWaveform } from "./DeckWaveform";

/**
 * Lane master de um deck com selector estreito para evitar reconciliação cruzada.
 *
 * @param id Deck renderizado no lane.
 */
const MasterWaveformLane = memo(function MasterWaveformLane({ id }: { id: DeckId }) {
  const deck = useMixerSelector(
    useCallback((snapshot) => selectMasterWaveDeckView(snapshot, id), [id]),
    masterWaveDeckViewEqual,
  );

  return (
    <div className="mixer-waveforms-lane" data-deck={id}>
      <span className="mixer-waveforms-tag">{id.toUpperCase()}</span>
      <DeckWaveform
        id={id}
        variant="master"
        phase={0}
        bpm={0}
        durationSec={0}
        spinning={deck.spinning}
        peaks={deck.peaks}
        waveformV10={deck.waveformV10}
        accentColor={deck.accentColor}
        camelotKey={deck.camelotKey}
        masterVisibleBars={MASTER_VISIBLE_BARS}
      />
    </div>
  );
});

/**
 * Faixas master: A em cima e B embaixo, no mesmo espaço do mixer.
 */
export const MasterWaveforms = memo(function MasterWaveforms() {
  return (
    <div className="mixer-waveforms" aria-label="Waveforms master">
      <MasterWaveformLane id="a" />
      <MasterWaveformLane id="b" />
    </div>
  );
});

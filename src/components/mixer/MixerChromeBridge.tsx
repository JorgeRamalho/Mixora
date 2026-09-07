import { useEffect } from "react";
import type { BrowseChipTrack } from "./BrowseChip";
import type { MidiLatency } from "../../lib/midi/use-midi-controller";
import type { MidiLinkStatus } from "../../lib/midi/midi-session";
import {
  registerMixerChromeActions,
  resetMixerChrome,
  updateMixerChrome,
} from "../../lib/mixer-chrome";
import type { BrowseSource, DeckId } from "../../types/mixer";

type MixerChromeBridgeProps = {
  browseSource: BrowseSource;
  changeBrowseSource: (source: BrowseSource) => void;
  browseTrack: BrowseChipTrack | null;
  browsePosition: number;
  browseTotal: number;
  browseLoading: boolean;
  activeDeck: DeckId;
  pendingLoad: DeckId | null;
  libraryError: boolean;
  cabinetHeadHidden: boolean;
  midiStatus: MidiLinkStatus;
  midiDeviceName: string | null;
  midiPorts: string[];
  midiLastHeard: string | null;
  midiError: string | null;
  midiLive: boolean;
  midiLatency: MidiLatency | null;
  onConnectMidi: () => void;
  toggleCabinetHead: () => void;
};

/**
 * Espelha o estado da cabine no store global, para o header e a status bar.
 *
 * @param props Estado e callbacks do `MixerBoard` que o chrome global precisa.
 */
export function MixerChromeBridge({
  browseSource,
  changeBrowseSource,
  browseTrack,
  browsePosition,
  browseTotal,
  browseLoading,
  activeDeck,
  pendingLoad,
  libraryError,
  cabinetHeadHidden,
  midiStatus,
  midiDeviceName,
  midiPorts,
  midiLastHeard,
  midiError,
  midiLive,
  midiLatency,
  onConnectMidi,
  toggleCabinetHead,
}: MixerChromeBridgeProps) {
  useEffect(() => {
    registerMixerChromeActions({
      changeBrowseSource,
      connectMidi: onConnectMidi,
      toggleCabinetHead,
    });
    updateMixerChrome({ mounted: true });
    return () => {
      resetMixerChrome();
    };
  }, [changeBrowseSource, onConnectMidi, toggleCabinetHead]);

  useEffect(() => {
    updateMixerChrome({
      browseSource,
      browseTrack,
      browsePosition,
      browseTotal,
      browseLoading,
      activeDeck,
      pendingLoad,
      libraryError,
      cabinetHeadHidden,
      midi: {
        status: midiStatus,
        deviceName: midiDeviceName,
        ports: midiPorts,
        lastHeard: midiLastHeard,
        error: midiError,
        live: midiLive,
        latency: midiLatency,
      },
    });
  }, [
    activeDeck,
    browseLoading,
    browsePosition,
    browseSource,
    browseTotal,
    browseTrack,
    cabinetHeadHidden,
    libraryError,
    midiDeviceName,
    midiError,
    midiLastHeard,
    midiLatency,
    midiLive,
    midiPorts,
    midiStatus,
    pendingLoad,
  ]);

  return null;
}

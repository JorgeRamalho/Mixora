import { useEffect } from "react";
import type { MidiLatency } from "../../lib/midi/use-midi-controller";
import type { MidiLinkStatus } from "../../lib/midi/midi-session";
import type { CueAudioRoutingSnapshot } from "../../lib/use-cue-audio-routing";
import {
  registerMixerChromeActions,
  resetMixerChrome,
  updateMixerChrome,
} from "../../lib/mixer-chrome";
import {
  applyMixerStageTheme,
  clearMixerStageTheme,
  type MixerStagePalette,
} from "../../lib/mixer-stage-palette";

type MixerChromeBridgeProps = {
  midiStatus: MidiLinkStatus;
  midiDeviceName: string | null;
  midiPorts: string[];
  midiLastHeard: string | null;
  midiError: string | null;
  midiLive: boolean;
  midiLatency: MidiLatency | null;
  camelot: MixerStagePalette;
  cueAudio: CueAudioRoutingSnapshot;
  onConnectMidi: () => void;
};

/**
 * Espelha o estado da cabine no store global e no `html`, para o header e o
 * fundo da rota herdarem a hora Camelot que está tocando.
 *
 * @param props Estado e callbacks do `MixerBoard` que o chrome global precisa.
 */
export function MixerChromeBridge({
  midiStatus,
  midiDeviceName,
  midiPorts,
  midiLastHeard,
  midiError,
  midiLive,
  midiLatency,
  camelot,
  cueAudio,
  onConnectMidi,
}: MixerChromeBridgeProps) {
  useEffect(() => {
    registerMixerChromeActions({
      connectMidi: onConnectMidi,
      chooseCueOutput: cueAudio.chooseOutput,
      retryCueOutput: cueAudio.retry,
    });
    updateMixerChrome({ mounted: true });
    return () => {
      clearMixerStageTheme();
      resetMixerChrome();
    };
  }, [cueAudio.chooseOutput, cueAudio.retry, onConnectMidi]);

  useEffect(() => {
    updateMixerChrome({
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
    midiDeviceName,
    midiError,
    midiLastHeard,
    midiLatency,
    midiLive,
    midiPorts,
    midiStatus,
  ]);

  useEffect(() => {
    applyMixerStageTheme(camelot);
    updateMixerChrome({
      camelot: {
        a: camelot.camelotA,
        b: camelot.camelotB,
        live: camelot.camelotLive,
        playing: camelot.playing,
      },
    });
  }, [camelot]);

  useEffect(() => {
    updateMixerChrome({
      cueAudio: {
        status: cueAudio.status,
        deviceLabel: cueAudio.deviceLabel,
        detail: cueAudio.detail,
        canChooseOutput: cueAudio.canChooseOutput,
      },
    });
  }, [cueAudio.canChooseOutput, cueAudio.detail, cueAudio.deviceLabel, cueAudio.status]);

  return null;
}

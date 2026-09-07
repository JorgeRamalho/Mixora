import { useSyncExternalStore } from "react";
import { getMixerChromeActions, getMixerChromeSnapshot, subscribeMixerChrome } from "../../lib/mixer-chrome";
import { MidiStatus } from "../mixer/MidiStatus";

const STATUS_SHORT: Record<string, string> = {
  unavailable: "MIDI off",
  denied: "MIDI negado",
  disconnected: "MIDI",
  connected: "MIDI",
};

/**
 * Controle compacto de MIDI no header, com painel de diagnóstico no hover ou foco.
 */
export function MixerHeaderMidi() {
  const chrome = useSyncExternalStore(subscribeMixerChrome, getMixerChromeSnapshot, getMixerChromeSnapshot);
  const actions = getMixerChromeActions();

  if (!chrome.mounted || !actions || !chrome.cabinetHeadHidden) return null;

  const { midi } = chrome;
  const shortLabel =
    midi.status === "connected" && midi.deviceName
      ? midi.deviceName.replace(/pioneer|ddj/gi, "").trim() || "DDJ-400"
      : STATUS_SHORT[midi.status] ?? "MIDI";

  return (
    <div className="mixer-header-midi">
      <button
        type="button"
        className="mixer-header-midi-trigger"
        aria-haspopup="dialog"
        aria-controls="mixer-header-midi-panel"
        data-state={midi.status}
        data-live={midi.live ? "true" : "false"}
        title="Controladora MIDI"
      >
        <span className="mixer-midi-dot" aria-hidden="true" />
        <span className="mixer-header-midi-label">{shortLabel}</span>
      </button>
      <div
        id="mixer-header-midi-panel"
        className="mixer-header-midi-panel"
        role="dialog"
        aria-label="Painel de diagnóstico MIDI"
      >
        <MidiStatus
          status={midi.status}
          deviceName={midi.deviceName}
          ports={midi.ports}
          lastHeard={midi.lastHeard}
          error={midi.error}
          live={midi.live}
          latency={midi.latency}
          onConnect={actions.connectMidi}
        />
      </div>
    </div>
  );
}

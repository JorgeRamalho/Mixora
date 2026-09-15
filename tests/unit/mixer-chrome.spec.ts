import { describe, expect, it, afterEach } from "vitest";
import {
  getMixerChromeSnapshot,
  resetMixerChrome,
  updateMixerChrome,
} from "../../src/lib/mixer-chrome";
import { DEFAULT_WAVEFORM_ACCENT } from "../../src/lib/waveform-palette";

afterEach(() => {
  resetMixerChrome();
});

describe("updateMixerChrome", () => {
  it("preserva o MIDI ao espelhar a paleta Camelot", () => {
    updateMixerChrome({
      mounted: true,
      midi: {
        status: "connected",
        deviceName: "DDJ-400",
        ports: ["DDJ-400"],
        lastHeard: "now",
        error: null,
        live: true,
        latency: null,
      },
    });
    updateMixerChrome({
      camelot: {
        a: "#f5b04a",
        b: "#e8455a",
        live: "#f5b04a",
        playing: true,
      },
    });
    const chrome = getMixerChromeSnapshot();
    expect(chrome.midi.deviceName).toBe("DDJ-400");
    expect(chrome.cueAudio.status).toBe("default");
    expect(chrome.camelot.live).toBe("#f5b04a");
    expect(chrome.camelot.playing).toBe(true);
    resetMixerChrome();
    expect(getMixerChromeSnapshot().camelot.live).toBe(DEFAULT_WAVEFORM_ACCENT);
    expect(getMixerChromeSnapshot().mounted).toBe(false);
  });
});

import { describe, expect, test } from "vitest";
import {
  isCueLeakOutputLabel,
  isDdj400AudioLabel,
  pickDdj400PhonesDevice,
  resolveAudioOutputDevice,
  saveStoredCueSinkId,
  scoreDdj400PhonesDevice,
} from "../../src/lib/cue-audio-routing";

function audioOutput(label: string, deviceId = label): MediaDeviceInfo {
  return {
    deviceId,
    kind: "audiooutput",
    label,
    groupId: "g",
    toJSON: () => ({}),
  };
}

describe("cue-audio-routing — DDJ-400 PHONES", () => {
  test("prefere o endpoint PHONES explícito", () => {
    const devices = [
      audioOutput("Speakers (Realtek)"),
      audioOutput("Line (2- DDJ-400)", "line"),
      audioOutput("DDJ-400 : PHONES", "phones"),
    ];

    expect(pickDdj400PhonesDevice(devices)?.deviceId).toBe("phones");
    expect(scoreDdj400PhonesDevice(audioOutput("DDJ-400 WASAPI : PHONES"))).toBeGreaterThan(
      scoreDdj400PhonesDevice(audioOutput("Line (2- DDJ-400)")),
    );
    expect(scoreDdj400PhonesDevice(audioOutput("DDJ-400 WASAPI : MASTER + Speakers"))).toBe(-1);
    expect(scoreDdj400PhonesDevice(audioOutput("Line (2- DDJ-400)"))).toBe(-1);
  });

  test("resolve saída pelo deviceId persistido", () => {
    const devices = [audioOutput("DDJ-400 WASAPI : PHONES", "phones-id")];
    saveStoredCueSinkId("phones-id");
    expect(resolveAudioOutputDevice(devices, "phones-id")?.label).toContain("PHONES");
  });

  test("recusa Line e Speakers da DDJ-400 porque são o master USB", () => {
    const devices = [audioOutput("Speakers (Realtek)"), audioOutput("Line (2- DDJ-400)", "line")];
    expect(pickDdj400PhonesDevice(devices)).toBeNull();
    expect(isCueLeakOutputLabel("Line (2- DDJ-400)")).toBe(true);
    expect(isCueLeakOutputLabel("Speakers (DDJ-400)")).toBe(true);
    expect(isCueLeakOutputLabel("DDJ-400 WASAPI : PHONES")).toBe(false);
  });

  test("ignora portas MIDI e dispositivos sem DDJ-400 no nome", () => {
    const devices = [
      audioOutput("MIDIIN2 (2- DDJ-400)"),
      audioOutput("Speakers (Realtek)"),
      { ...audioOutput(""), deviceId: "empty", label: "" },
    ];
    expect(pickDdj400PhonesDevice(devices)).toBeNull();
    expect(isDdj400AudioLabel("MIDIIN2 (2- DDJ-400)")).toBe(true);
    expect(scoreDdj400PhonesDevice(audioOutput("MIDIIN2 (2- DDJ-400)"))).toBe(-1);
  });
});

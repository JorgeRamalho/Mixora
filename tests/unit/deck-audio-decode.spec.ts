import { describe, expect, test } from "vitest";
import { decodeDeckFile } from "../../src/lib/deck-audio-decode";
import { parseBpmFromFilename, titleFromFilename } from "../../src/lib/deck-metadata";
import { MockAudioContext } from "../helpers/mock-audio-context";

describe("deck-audio-decode", () => {
  test("U-01 arquivo válido → duration > 0", async () => {
    const ctx = new MockAudioContext();
    const file = new File([new Uint8Array(2048)], "mixer-kick-120bpm.mp3", { type: "audio/mpeg" });
    const decoded = await decodeDeckFile(ctx as unknown as AudioContext, file);
    expect(decoded.durationSec).toBeGreaterThan(0);
    expect(decoded.title).toContain("mixer-kick-120bpm");
    expect(decoded.bpm).toBe(120);
  });

  test("U-02 arquivo inválido → throw", async () => {
    const ctx = new MockAudioContext();
    const file = new File([new Uint8Array(4)], "vazio.mp3", { type: "audio/mpeg" });
    await expect(decodeDeckFile(ctx as unknown as AudioContext, file)).rejects.toThrow(/inválido/);
  });

  test("parseBpmFromFilename e título", () => {
    expect(parseBpmFromFilename("kick-120bpm.mp3")).toBe(120);
    expect(parseBpmFromFilename("faixa.mp3")).toBeUndefined();
    expect(titleFromFilename("pasta/kick-120bpm.mp3")).toBe("kick-120bpm");
  });
});

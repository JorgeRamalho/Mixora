import { describe, expect, test } from "vitest";
import { decodeDeckBuffer, decodeDeckFile } from "../../src/lib/deck-audio-decode";
import {
  parseBpmFromFilename,
  parseCamelotFromFilename,
  titleFromFilename,
} from "../../src/lib/deck-metadata";
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

  test("decodeDeckBuffer reusa os mesmos bytes sem File", async () => {
    const ctx = new MockAudioContext();
    const data = new Uint8Array(2048).buffer;
    const decoded = await decodeDeckBuffer(ctx as unknown as AudioContext, data, {
      title: "Voices",
      bpm: 128,
    });
    expect(decoded.title).toBe("Voices");
    expect(decoded.bpm).toBe(128);
    expect(decoded.durationSec).toBeGreaterThan(0);
  });

  test("parseBpmFromFilename e título", () => {
    expect(parseBpmFromFilename("kick-120bpm.mp3")).toBe(120);
    expect(parseBpmFromFilename("faixa.mp3")).toBeUndefined();
    expect(titleFromFilename("pasta/kick-120bpm.mp3")).toBe("kick-120bpm");
  });

  test("parseCamelotFromFilename reconhece o código no nome", () => {
    expect(parseCamelotFromFilename("04. (6B) glacial - scuba.mp3")).toBe("6B");
    expect(parseCamelotFromFilename("pasta/[8A] kick.wav")).toBe("8A");
    expect(parseCamelotFromFilename("faixa 11a mix.mp3")).toBe("11A");
    expect(parseCamelotFromFilename("sem tom.mp3")).toBeUndefined();
  });

  test("decodeDeckFile infere a key Camelot do nome", async () => {
    const ctx = new MockAudioContext();
    const file = new File([new Uint8Array(2048)], "04. (6B) glacial - scuba.mp3", {
      type: "audio/mpeg",
    });
    const decoded = await decodeDeckFile(ctx as unknown as AudioContext, file);
    expect(decoded.key).toBe("6B");
  });
});

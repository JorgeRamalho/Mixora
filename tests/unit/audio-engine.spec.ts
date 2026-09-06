import { afterEach, describe, expect, test, vi } from "vitest";
import { TRAINING_TRACKS } from "../../src/data/training-tracks";
import type { MamuteEngine } from "../../src/lib/audio-engine";
import { createTestEngine } from "../helpers/audio-engine-harness";
import type { MockBufferSource } from "../helpers/mock-audio-context";

const TRACK_SLOWER = "radio-deezer-02";
const TRACK_FASTER = "radio-youtube-01";

let engine: MamuteEngine | undefined;

afterEach(() => {
  engine?.__test__.stopPhaseLoop();
  engine = undefined;
  vi.useRealTimers();
});

describe("MamuteEngine — loadTrack (L1–L6)", () => {
  test("L1 carrega a faixa e atualiza BPM e título", async () => {
    ({ engine } = await createTestEngine());
    const track = TRAINING_TRACKS.find((item) => item.id === TRACK_FASTER);
    expect(track).toBeTruthy();
    engine.loadTrack("b", TRACK_FASTER);
    expect(engine.snapshot.b.track.id).toBe(TRACK_FASTER);
    expect(engine.snapshot.b.bpm).toBe(track?.bpm);
    expect(engine.snapshot.b.track.title).toBe(track?.title);
  });

  test("L2 zera o pitch ao carregar", async () => {
    ({ engine } = await createTestEngine());
    engine.setPitch("a", 4);
    engine.loadTrack("a", TRACK_SLOWER);
    expect(engine.snapshot.a.pitch).toBe(0);
  });

  test("L3 preserva playing: se tocava, volta a tocar", async () => {
    ({ engine } = await createTestEngine());
    await engine.toggle("a");
    expect(engine.snapshot.a.playing).toBe(true);
    engine.loadTrack("a", TRACK_SLOWER);
    expect(engine.snapshot.a.playing).toBe(true);
    expect(lastSource(engine, "a")?.started).toBe(true);
  });

  test("L4 preserva paused: se estava parado, continua parado", async () => {
    ({ engine } = await createTestEngine());
    engine.loadTrack("a", TRACK_SLOWER);
    expect(engine.snapshot.a.playing).toBe(false);
  });

  test("L5 id desconhecido é no-op", async () => {
    ({ engine } = await createTestEngine());
    const before = engine.snapshot.a.track.id;
    engine.loadTrack("a", "faixa-que-nao-existe");
    expect(engine.snapshot.a.track.id).toBe(before);
  });

  test("L6 com sync religa o pitch depois do load", async () => {
    ({ engine } = await createTestEngine());
    engine.loadTrack("b", TRACK_SLOWER);
    engine.setSync("b", true);
    const pitched = engine.snapshot.b.pitch;
    expect(pitched).not.toBe(0);
    engine.loadTrack("b", TRACK_FASTER);
    expect(engine.snapshot.b.sync).toBe(true);
    expect(engine.snapshot.b.pitch).not.toBe(0);
    expect(engine.snapshot.b.pitch).not.toBe(pitched);
  });
});

describe("MamuteEngine — applySync (S1–S5)", () => {
  test("S1 pitch = ((bpm master / bpm deck) - 1) * 100", async () => {
    ({ engine } = await createTestEngine());
    engine.loadTrack("b", TRACK_SLOWER);
    engine.__test__.applySync("b");
    const master = engine.snapshot.a.bpm;
    const deck = engine.snapshot.b.bpm;
    expect(engine.snapshot.b.pitch).toBeCloseTo(((master / deck) - 1) * 100, 5);
  });

  test("S2 o deck master sincronizado com ele mesmo zera o pitch", async () => {
    ({ engine } = await createTestEngine());
    engine.setPitch("a", 3);
    engine.__test__.applySync("a");
    expect(engine.snapshot.a.pitch).toBe(0);
  });

  test("S3 playbackRate segue o pitch calculado", async () => {
    ({ engine } = await createTestEngine());
    await engine.toggle("b");
    engine.loadTrack("b", TRACK_SLOWER);
    engine.setSync("b", true);
    const source = lastSource(engine, "b");
    expect(source?.playbackRate.value).toBeCloseTo(1 + engine.snapshot.b.pitch / 100, 5);
  });

  test("S4 trocar o master reaplica o sync nos dois decks", async () => {
    ({ engine } = await createTestEngine());
    engine.loadTrack("b", TRACK_SLOWER);
    engine.setSync("a", true);
    engine.setSync("b", true);
    engine.setMasterDeck("b");
    expect(engine.snapshot.masterDeck).toBe("b");
    expect(engine.snapshot.b.masterTempo).toBe(true);
    expect(engine.snapshot.b.pitch).toBe(0);
    expect(engine.snapshot.a.pitch).not.toBe(0);
  });

  test("S5 sem grafo ainda, o snapshot recebe o pitch mesmo assim", async () => {
    ({ engine } = await createTestEngine({ ensure: false }));
    engine.loadTrack("b", TRACK_SLOWER);
    engine.__test__.applySync("b");
    expect(engine.snapshot.b.pitch).not.toBe(0);
    expect(engine.__test__.decks()).toBeNull();
  });
});

describe("MamuteEngine — applyGains (G1–G6)", () => {
  test("G1 crossfader em 0 entrega A e silencia B", async () => {
    ({ engine } = await createTestEngine());
    engine.setCrossfader(0);
    const decks = engine.__test__.decks();
    expect(decks?.a.gain.gain.value).toBeCloseTo(engine.snapshot.a.gain, 5);
    expect(decks?.b.gain.gain.value).toBe(0);
  });

  test("G2 crossfader em 1 entrega B e silencia A", async () => {
    ({ engine } = await createTestEngine());
    engine.setCrossfader(1);
    const decks = engine.__test__.decks();
    expect(decks?.a.gain.gain.value).toBeCloseTo(0, 10);
    expect(decks?.b.gain.gain.value).toBeCloseTo(engine.snapshot.b.gain, 5);
  });

  test("G3 centro é equal-power, não linear", async () => {
    ({ engine } = await createTestEngine());
    engine.setCrossfader(0.5);
    const decks = engine.__test__.decks();
    const expected = engine.snapshot.a.gain * Math.cos(Math.PI / 4);
    expect(decks?.a.gain.gain.value).toBeCloseTo(expected, 5);
    expect(decks?.b.gain.gain.value).toBeCloseTo(engine.snapshot.b.gain * Math.sin(Math.PI / 4), 5);
  });

  test("G4 o fader do canal multiplica o crossfader", async () => {
    ({ engine } = await createTestEngine());
    engine.setCrossfader(0);
    engine.setGain("a", 0.4);
    expect(engine.__test__.decks()?.a.gain.gain.value).toBeCloseTo(0.4, 5);
  });

  test("G5 o master node segue o snapshot", async () => {
    ({ engine } = await createTestEngine());
    engine.setMaster(0.3);
    expect(engine.__test__.master()?.gain.value).toBe(0.3);
  });

  test("G6 booth, cueMix e masterCue movem o grafo de fone", async () => {
    ({ engine } = await createTestEngine());
    engine.setBooth(0.11);
    engine.setCueMix(0.22);
    engine.setMasterCue(true);
    expect(engine.snapshot.booth).toBe(0.11);
    expect(engine.snapshot.cueMix).toBe(0.22);
    expect(engine.snapshot.masterCue).toBe(true);
    expect(engine.__test__.headphonesGain()?.gain.value).toBe(0.11);
    expect(engine.__test__.cueMasterGain()?.gain.value).toBe(1);
    expect(engine.__test__.cuePflGain()?.gain.value).toBe(0);
  });
});

describe("MamuteEngine — toggle (T1–T6)", () => {
  test("T1 ensure cria o contexto na primeira vez", async () => {
    ({ engine } = await createTestEngine({ ensure: false }));
    expect(engine.__test__.ctx()).toBeNull();
    await engine.toggle("a");
    expect(engine.__test__.ctx()).toBeTruthy();
  });

  test("T2 play marca playing e cria source em loop", async () => {
    ({ engine } = await createTestEngine());
    await engine.toggle("a");
    expect(engine.snapshot.a.playing).toBe(true);
    const source = lastSource(engine, "a");
    expect(source?.loop).toBe(true);
    expect(source?.started).toBe(true);
  });

  test("T3 pause zera playing e para o source", async () => {
    ({ engine } = await createTestEngine());
    await engine.toggle("a");
    await engine.toggle("a");
    expect(engine.snapshot.a.playing).toBe(false);
    expect(engine.__test__.decks()?.a.source).toBeNull();
  });

  test("T4 o offset do start é phase * duração do loop", async () => {
    ({ engine } = await createTestEngine());
    engine.snapshot.a.phase = 0.25;
    await engine.toggle("a");
    const buffer = engine.__test__.decks()?.a.buffer;
    expect(lastSource(engine, "a")?.startOffset).toBeCloseTo((buffer?.duration ?? 0) * 0.25, 5);
  });

  test("T5 o source do loop sintético nasce com loop=true", async () => {
    ({ engine } = await createTestEngine());
    engine.__test__.start("a");
    expect(lastSource(engine, "a")?.loop).toBe(true);
  });

  test("T6 pause guarda a phase e o próximo play usa esse offset", async () => {
    const created = await createTestEngine();
    engine = created.engine;
    const ctx = created.ctx;
    await engine.toggle("a");
    ctx.advance(0.5);
    await engine.toggle("a");
    const paused = engine.snapshot.a.phase;
    expect(paused).toBeGreaterThan(0);
    await engine.toggle("a");
    const buffer = engine.__test__.decks()?.a.buffer;
    expect(lastSource(engine, "a")?.startOffset).toBeCloseTo((buffer?.duration ?? 0) * paused, 4);
  });
});

describe("MamuteEngine — cue momentâneo (C6–C8)", () => {
  test("C6 pausado, pressCue toca a partir do cue", async () => {
    ({ engine } = await createTestEngine());
    engine.setCueBeat("a", 2);
    engine.pressCue("a");
    expect(engine.snapshot.a.playing).toBe(true);
    expect(engine.snapshot.a.phase).toBeCloseTo(0.25, 5);
  });

  test("C7 releaseCue para no ponto de cue", async () => {
    const created = await createTestEngine();
    engine = created.engine;
    const ctx = created.ctx;
    engine.setCueBeat("a", 2);
    engine.pressCue("a");
    ctx.advance(0.3);
    engine.releaseCue("a");
    expect(engine.snapshot.a.playing).toBe(false);
    expect(engine.snapshot.a.phase).toBeCloseTo(0.25, 5);
  });

  test("C8 tocando, pressCue salta ao cue sem preview", async () => {
    ({ engine } = await createTestEngine());
    await engine.toggle("a");
    engine.setCueBeat("a", 4);
    engine.pressCue("a");
    expect(engine.snapshot.a.playing).toBe(true);
    expect(engine.snapshot.a.phase).toBeCloseTo(0.5, 5);
    engine.releaseCue("a");
    expect(engine.snapshot.a.playing).toBe(true);
  });
});

describe("MamuteEngine — callCue (C1–C5)", () => {
  test("C1 a phase vira cueBeat / 8", async () => {
    ({ engine } = await createTestEngine());
    engine.setCueBeat("a", 2);
    engine.callCue("a");
    expect(engine.snapshot.a.phase).toBeCloseTo(0.25, 5);
  });

  test("C2 tocando, o callCue reinicia o source no ponto", async () => {
    ({ engine } = await createTestEngine());
    await engine.toggle("a");
    const first = lastSource(engine, "a");
    engine.setCueBeat("a", 4);
    engine.callCue("a");
    const second = lastSource(engine, "a");
    expect(second).not.toBe(first);
    expect(engine.snapshot.a.playing).toBe(true);
    expect(engine.snapshot.a.phase).toBeCloseTo(0.5, 5);
  });

  test("C3 pausado, só a phase muda e o deck não arranca", async () => {
    ({ engine } = await createTestEngine());
    engine.setCueBeat("a", 2);
    engine.callCue("a");
    expect(engine.snapshot.a.playing).toBe(false);
    expect(engine.snapshot.a.phase).toBeCloseTo(0.25, 5);
  });

  test("C4 beat 8 dá a volta para phase 0", async () => {
    ({ engine } = await createTestEngine());
    engine.setCueBeat("a", 8);
    engine.callCue("a");
    expect(engine.snapshot.a.phase).toBe(0);
  });

  test("C5 tocando depois de elapsed, callCue reinicia no cue e não no relógio antigo", async () => {
    const created = await createTestEngine();
    engine = created.engine;
    const ctx = created.ctx;
    await engine.toggle("a");
    ctx.advance(0.4);
    engine.setCueBeat("a", 0);
    engine.callCue("a");
    expect(engine.snapshot.a.playing).toBe(true);
    expect(engine.snapshot.a.phase).toBeCloseTo(0, 5);
    expect(lastSource(engine, "a")?.startOffset).toBeCloseTo(0, 5);
  });
});

describe("MamuteEngine — nudge (N1–N5)", () => {
  test("N1 modo cdj empurra 0.018", async () => {
    ({ engine } = await createTestEngine());
    engine.setJogMode("a", "cdj");
    engine.snapshot.a.phase = 0.4;
    engine.nudge("a", 1);
    expect(engine.snapshot.a.phase).toBeCloseTo(0.418, 5);
  });

  test("N2 modo vinyl empurra 0.035", async () => {
    ({ engine } = await createTestEngine());
    engine.setJogMode("a", "vinyl");
    engine.snapshot.a.phase = 0.4;
    engine.nudge("a", 1);
    expect(engine.snapshot.a.phase).toBeCloseTo(0.435, 5);
  });

  test("N3 a phase dá a volta abaixo de zero", async () => {
    ({ engine } = await createTestEngine());
    engine.setJogMode("a", "cdj");
    engine.snapshot.a.phase = 0.01;
    engine.nudge("a", -1);
    expect(engine.snapshot.a.phase).toBeCloseTo(0.992, 5);
  });

  test("N4 o playbackRate sobe no gesto", async () => {
    ({ engine } = await createTestEngine());
    await engine.toggle("a");
    engine.setPitch("a", 0);
    engine.nudge("a", 1);
    expect(lastSource(engine, "a")?.playbackRate.value).toBeCloseTo(1.04, 5);
  });

  test("N5 depois de 120ms o rate volta ao pitch", async () => {
    vi.useFakeTimers();
    ({ engine } = await createTestEngine());
    await engine.toggle("a");
    engine.nudge("a", 1);
    vi.advanceTimersByTime(120);
    expect(lastSource(engine, "a")?.playbackRate.value).toBeCloseTo(1, 5);
  });
});

describe("MamuteEngine — setPitch (P1–P4)", () => {
  test("P1 grava o snapshot", async () => {
    ({ engine } = await createTestEngine());
    engine.setPitch("a", -3.5);
    expect(engine.snapshot.a.pitch).toBe(-3.5);
    expect(engine.effectiveBpm("a")).toBeCloseTo(engine.snapshot.a.bpm * 0.965, 5);
  });

  test("P2 o source tocando segue o playbackRate", async () => {
    ({ engine } = await createTestEngine());
    await engine.toggle("a");
    engine.setPitch("a", 8);
    expect(lastSource(engine, "a")?.playbackRate.value).toBeCloseTo(1.08, 5);
  });

  test("P3 com sync o setPitch é sobrescrito pela fórmula", async () => {
    ({ engine } = await createTestEngine());
    engine.loadTrack("b", TRACK_SLOWER);
    engine.setSync("b", true);
    const synced = engine.snapshot.b.pitch;
    engine.setPitch("b", 8);
    expect(engine.snapshot.b.pitch).toBeCloseTo(synced, 5);
  });

  test("P4 sem source o snapshot muda mesmo assim", async () => {
    ({ engine } = await createTestEngine({ ensure: false }));
    engine.setPitch("a", 2);
    expect(engine.snapshot.a.pitch).toBe(2);
  });
});

describe("MamuteEngine — rebuildBuffer (R1–R4)", () => {
  test("R1 duração ≈ (60/bpm)×8 beats", async () => {
    ({ engine } = await createTestEngine());
    const bpm = engine.snapshot.a.bpm;
    const expected = (60 / bpm) * 8;
    const buffer = engine.__test__.decks()?.a.buffer;
    expect(buffer?.duration).toBeCloseTo(expected, 2);
  });

  test("R2 o loop sintético é estéreo", async () => {
    ({ engine } = await createTestEngine());
    expect(engine.__test__.decks()?.a.buffer?.numberOfChannels).toBe(2);
  });

  test("R3 loadTrack reconstrói o buffer no BPM novo", async () => {
    ({ engine } = await createTestEngine());
    engine.loadTrack("a", TRACK_FASTER);
    const expected = (60 / engine.snapshot.a.bpm) * 8;
    expect(engine.__test__.decks()?.a.buffer?.duration).toBeCloseTo(expected, 2);
  });

  test("R4 sem contexto o rebuild é no-op", async () => {
    ({ engine } = await createTestEngine({ ensure: false }));
    engine.__test__.rebuildBuffer("a");
    expect(engine.__test__.decks()).toBeNull();
  });
});

describe("MamuteEngine — phase loop (PH1–PH5)", () => {
  test("PH1 o interval é 50ms", async () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    ({ engine } = await createTestEngine());
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 50);
    expect(engine.__test__.phaseTimer()).not.toBeNull();
  });

  test("PH2 a phase avança com currentTime e o rate", async () => {
    vi.useFakeTimers();
    const created = await createTestEngine();
    engine = created.engine;
    const ctx = created.ctx;
    await engine.toggle("a");
    ctx.advance(1);
    vi.advanceTimersByTime(50);
    const duration = engine.__test__.decks()?.a.buffer?.duration ?? 1;
    expect(engine.snapshot.a.phase).toBeCloseTo((1 / duration) % 1, 3);
  });

  test("PH3 deck pausado não atualiza phase no tick", async () => {
    vi.useFakeTimers();
    ({ engine } = await createTestEngine());
    engine.snapshot.a.phase = 0.3;
    vi.advanceTimersByTime(200);
    expect(engine.snapshot.a.phase).toBe(0.3);
  });

  test("PH4 a phase permanece em [0, 1)", async () => {
    vi.useFakeTimers();
    const created = await createTestEngine();
    engine = created.engine;
    const ctx = created.ctx;
    await engine.toggle("a");
    ctx.advance(100);
    vi.advanceTimersByTime(50);
    expect(engine.snapshot.a.phase).toBeGreaterThanOrEqual(0);
    expect(engine.snapshot.a.phase).toBeLessThan(1);
  });

  test.todo("PH5 loop ativo recorta o playback ao IN/OUT em arquivo e sintético");
});

describe("MamuteEngine — demais métodos públicos", () => {
  test("analyser existe depois do ensure e é nulo antes", async () => {
    ({ engine } = await createTestEngine({ ensure: false }));
    expect(engine.analyser("a")).toBeNull();
    await engine.ensure();
    expect(engine.analyser("a")).toBeTruthy();
  });

  test("setEq, trim e filter atualizam snapshot e nós", async () => {
    ({ engine } = await createTestEngine());
    engine.setEq("a", "high", 6);
    engine.setTrim("a", 0.5);
    engine.setFilter("a", -40);
    const nodes = engine.__test__.decks()?.a;
    expect(nodes?.high.gain.value).toBe(6);
    expect(nodes?.low.gain.value).toBe(0);
    expect(nodes?.trim.gain.value).toBe(0.5);
    expect(nodes?.filter.type).toBe("lowpass");
    engine.setFilter("a", 80);
    expect(engine.__test__.decks()?.a.filter.type).toBe("highpass");
    engine.setFilter("a", 0);
    expect(engine.__test__.decks()?.a.filter.frequency.value).toBe(20000);
  });

  test("setCueMonitor, jog e quantize atualizam snapshot e roteamento", async () => {
    ({ engine } = await createTestEngine());
    engine.setCueMonitor("a", true);
    engine.setJogMode("a", "vinyl");
    engine.setQuantize("a", false);
    expect(engine.snapshot.a.cueMonitor).toBe(true);
    expect(engine.snapshot.a.jogMode).toBe("vinyl");
    expect(engine.snapshot.a.quantize).toBe(false);
    expect(engine.__test__.decks()?.a.cueSend.gain.value).toBeGreaterThan(0);
  });

  test("hot cue grava e dispara, e slot vazio é no-op", async () => {
    ({ engine } = await createTestEngine());
    engine.snapshot.a.phase = 0.5;
    engine.setHotCue("a", 2);
    const cue = engine.snapshot.a.hotCues.find((item) => item.slot === 2);
    expect(cue?.set).toBe(true);
    engine.triggerHotCue("a", 2);
    expect(engine.snapshot.a.playing).toBe(true);
    engine.setHotCue("a", 99);
    engine.triggerHotCue("a", 99);
  });

  test("toggleLoop liga 4 beats e depois desliga", async () => {
    ({ engine } = await createTestEngine());
    engine.snapshot.a.phase = 0.25;
    engine.toggleLoop("a");
    expect(engine.snapshot.a.loop.active).toBe(true);
    expect(engine.snapshot.a.loop.outBeat).toBe((engine.snapshot.a.loop.inBeat ?? 0) + 4);
    engine.toggleLoop("a");
    expect(engine.snapshot.a.loop.active).toBe(false);
    expect(engine.snapshot.a.loop.inBeat).toBeNull();
  });

  test("U-05 loadDeckBuffer preserva playing", async () => {
    const created = await createTestEngine();
    engine = created.engine;
    const ctx = created.ctx;
    await engine.toggle("a");
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    engine.loadDeckBuffer("a", buffer as unknown as AudioBuffer, {
      title: "kick",
      bpm: 120,
      durationSec: buffer.duration,
    });
    expect(engine.snapshot.a.playing).toBe(true);
    expect(engine.snapshot.a.sourceKind).toBe("file");
    expect(engine.snapshot.a.peaks?.length).toBe(512);
    expect(lastSource(engine, "a")?.loop).toBe(false);
  });

  test("U-07 arquivo real toca uma vez e para no fim", async () => {
    const created = await createTestEngine();
    engine = created.engine;
    const ctx = created.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    engine.loadDeckBuffer("a", buffer as unknown as AudioBuffer, {
      title: "full-track",
      bpm: 120,
      durationSec: buffer.duration,
    });
    await engine.toggle("a");
    const source = lastSource(engine, "a");
    expect(source?.loop).toBe(false);
    expect(source?.onended).toBeTypeOf("function");
    source?.onended?.();
    expect(engine.snapshot.a.playing).toBe(false);
    expect(engine.snapshot.a.phase).toBe(0);
    expect(engine.snapshot.a.positionSec).toBe(0);
  });

  test("U-08 loop ativo num arquivo religa o source com região", async () => {
    const created = await createTestEngine();
    engine = created.engine;
    const ctx = created.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    engine.loadDeckBuffer("a", buffer as unknown as AudioBuffer, {
      title: "loop-track",
      bpm: 120,
      durationSec: buffer.duration,
    });
    await engine.toggle("a");
    engine.snapshot.a.phase = 0.25;
    engine.toggleLoop("a");
    const source = lastSource(engine, "a");
    expect(source?.loop).toBe(true);
    expect(source?.loopStart).toBeGreaterThan(0);
    expect(source?.loopEnd).toBeGreaterThan(source?.loopStart ?? 0);
  });

  test("U-06 callCue com buffer real usa segundos", async () => {
    const created = await createTestEngine();
    engine = created.engine;
    const ctx = created.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    engine.loadDeckBuffer("a", buffer as unknown as AudioBuffer, {
      title: "kick",
      bpm: 120,
      durationSec: buffer.duration,
    });
    engine.setCueBeat("a", 0.5);
    engine.callCue("a");
    expect(engine.snapshot.a.phase).toBeCloseTo(0.25, 5);

    await engine.toggle("a");
    ctx.advance(0.8);
    engine.setCueBeat("a", 0);
    engine.callCue("a");
    expect(engine.snapshot.a.phase).toBeCloseTo(0, 5);
    expect(lastSource(engine, "a")?.startOffset).toBeCloseTo(0, 5);
  });
});

/**
 * Último BufferSource do deck, que o engine troca a cada start.
 *
 * @param instance Engine sob teste.
 * @param id Deck.
 */
function lastSource(instance: MamuteEngine, id: "a" | "b"): MockBufferSource | null {
  return (instance.__test__.decks()?.[id].source as MockBufferSource | null) ?? null;
}

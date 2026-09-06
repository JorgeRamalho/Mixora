import { DEFAULT_DECK_TRACKS, getTrainingTrack } from "../data/training-tracks";
import { HOT_CUE_SLOTS } from "../types/mixer";
import type {
  DeckFileMeta,
  DeckId,
  DeckState,
  HotCue,
  JogMode,
  MixerSnapshot,
  TrainingTrack,
} from "../types/mixer";
import { decodeDeckFile } from "./deck-audio-decode";
import { computePeaks } from "./waveform-peaks";

export type { DeckState, MixerSnapshot } from "../types/mixer";

/** Fábrica de `AudioContext`, injetável nos testes para não usar o Web Audio real. */
export type AudioContextFactory = () => AudioContext;

/**
 * Opções do engine. A UI não passa nada, e os testes injetam o mock.
 */
export interface MamuteEngineOptions {
  createAudioContext?: AudioContextFactory;
}

function emptyHotCues(): HotCue[] {
  return Array.from({ length: HOT_CUE_SLOTS }, (_, index) => ({
    slot: index + 1,
    beat: index * 4,
    set: index === 0,
  }));
}

/**
 * Resolve a faixa com que um deck nasce.
 *
 * Não há fallback silencioso de propósito. O `??` que morava aqui foi o que
 * escondeu por várias ondas uma deck B apontando para um id fora de
 * `TRAINING_TRACKS`, e o sintoma era as duas decks nascerem na mesma faixa em
 * vez de um erro. Hoje o tipo `TrainingTrackId` já barra isso na compilação, e
 * este guarda existe para o caso de a biblioteca mudar em runtime.
 *
 * @param id Deck a inicializar.
 */
function defaultTrack(id: DeckId): TrainingTrack {
  const trackId = DEFAULT_DECK_TRACKS[id];
  const track = getTrainingTrack(trackId);
  if (!track) {
    throw new Error(`Faixa padrão ${trackId} fora de TRAINING_TRACKS`);
  }
  return track;
}

function createDeck(id: DeckId): DeckState {
  const track = defaultTrack(id);
  return {
    playing: false,
    bpm: track.bpm,
    pitch: 0,
    gain: 0.85,
    trim: 0.72,
    eq: { high: 0, mid: 0, low: 0 },
    filter: 0,
    sync: false,
    masterTempo: id === "a",
    cueMonitor: false,
    jogMode: "cdj",
    quantize: true,
    loop: { active: false, inBeat: null, outBeat: null },
    hotCues: emptyHotCues(),
    cueBeat: 0,
    track,
    phase: 0,
    sourceKind: "synthetic",
    durationSec: 0,
    positionSec: 0,
    peaks: null,
  };
}

function formatTrackDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function makeNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function writeKick(data: Float32Array, sampleRate: number, at: number, accent: number): void {
  const dur = Math.floor(sampleRate * 0.18);
  for (let i = 0; i < dur && at + i < data.length; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 28) * accent;
    const freq = 48 + 90 * Math.exp(-t * 40);
    const index = at + i;
    data[index] = (data[index] ?? 0) + Math.sin(2 * Math.PI * freq * t) * env;
  }
}

function writeHat(data: Float32Array, noise: Float32Array, sampleRate: number, at: number): void {
  const dur = Math.floor(sampleRate * 0.045);
  for (let i = 0; i < dur && at + i < data.length; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 70) * 0.22;
    const idx = (at + i) % noise.length;
    const index = at + i;
    data[index] = (data[index] ?? 0) + (noise[idx] ?? 0) * env;
  }
}

function buildLoop(ctx: AudioContext, bpm: number, color: DeckId): AudioBuffer {
  const bars = 2;
  const beats = bars * 4;
  const seconds = (60 / bpm) * beats;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const noise = makeNoiseBuffer(ctx, 1).getChannelData(0);
  const step = Math.floor((60 / bpm) * ctx.sampleRate);

  for (let beat = 0; beat < beats; beat += 1) {
    const at = beat * step;
    const accent = beat % 4 === 0 ? 1 : 0.78;
    writeKick(left, ctx.sampleRate, at, accent);
    writeKick(right, ctx.sampleRate, at, accent * 0.92);
    if (beat % 2 === 1) {
      writeHat(left, noise, ctx.sampleRate, at);
      writeHat(right, noise, ctx.sampleRate, at + 40);
    }
    if (color === "b" && beat % 4 === 2) {
      writeKick(left, ctx.sampleRate, at + Math.floor(step * 0.5), 0.35);
    }
  }
  return buffer;
}

class DeckNodes {
  source: AudioBufferSourceNode | null = null;
  trim: GainNode;
  gain: GainNode;
  cueSend: GainNode;
  filter: BiquadFilterNode;
  high: BiquadFilterNode;
  mid: BiquadFilterNode;
  low: BiquadFilterNode;
  analyser: AnalyserNode;
  buffer: AudioBuffer | null = null;
  startedAt = 0;
  pausedPhase = 0;
  /** True enquanto o CUE momentâneo toca com o deck pausado. */
  cuePreview = false;
  /** True enquanto o prato está tocado no modo vinyl. */
  scratching = false;

  /**
   * Monta a cadeia EQ do deck e liga o master e o bus de cue.
   *
   * @param ctx Contexto Web Audio.
   * @param masterDest Crossfader do deck.
   * @param cueSum Soma dos envios PFL.
   */
  constructor(ctx: AudioContext, masterDest: AudioNode, cueSum: AudioNode) {
    this.trim = ctx.createGain();
    this.gain = ctx.createGain();
    this.cueSend = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.high = ctx.createBiquadFilter();
    this.mid = ctx.createBiquadFilter();
    this.low = ctx.createBiquadFilter();
    this.analyser = ctx.createAnalyser();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 20000;
    this.filter.Q.value = 0.7;
    this.high.type = "highshelf";
    this.high.frequency.value = 9000;
    this.mid.type = "peaking";
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 0.9;
    this.low.type = "lowshelf";
    this.low.frequency.value = 180;
    this.analyser.fftSize = 512;
    this.cueSend.gain.value = 0;
    this.trim.connect(this.filter);
    this.filter.connect(this.low);
    this.low.connect(this.mid);
    this.mid.connect(this.high);
    this.high.connect(this.gain);
    this.gain.connect(this.analyser);
    this.analyser.connect(masterDest);
    this.gain.connect(this.cueSend);
    this.cueSend.connect(cueSum);
  }
}

export class MamuteEngine {
  private readonly createAudioContext: AudioContextFactory;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private xfA: GainNode | null = null;
  private xfB: GainNode | null = null;
  private cueSum: GainNode | null = null;
  private cuePflGain: GainNode | null = null;
  private cueMasterGain: GainNode | null = null;
  private cueMixBus: GainNode | null = null;
  private headphonesGain: GainNode | null = null;
  private cueStreamDest: MediaStreamAudioDestinationNode | null = null;
  private cueAudioEl: HTMLAudioElement | null = null;
  private decks: { a: DeckNodes; b: DeckNodes } | null = null;
  private phaseTimer: number | null = null;
  snapshot: MixerSnapshot = {
    a: createDeck("a"),
    b: createDeck("b"),
    crossfader: 0.5,
    master: 0.82,
    booth: 0.65,
    cueMix: 0.5,
    masterCue: false,
    masterDeck: "a",
  };

  /**
   * @param options Fábrica de contexto; omitida na cabine, obrigatória no harness.
   */
  constructor(options: MamuteEngineOptions = {}) {
    this.createAudioContext = options.createAudioContext ?? (() => new AudioContext());
  }

  /**
   * Superfície só para testes: métodos privados e nós do grafo.
   *
   * Não usar na UI. O getter existe para o harness não precisar de `as any`.
   */
  get __test__() {
    return {
      applySync: (id: DeckId) => this.applySync(id),
      applyGains: () => this.applyGains(),
      rebuildBuffer: (id: DeckId) => this.rebuildBuffer(id),
      start: (id: DeckId) => this.start(id),
      stop: (id: DeckId) => this.stop(id),
      ctx: () => this.ctx,
      decks: () => this.decks,
      master: () => this.master,
      xfA: () => this.xfA,
      xfB: () => this.xfB,
      cuePflGain: () => this.cuePflGain,
      cueMasterGain: () => this.cueMasterGain,
      headphonesGain: () => this.headphonesGain,
      phaseTimer: () => this.phaseTimer,
      stopPhaseLoop: () => {
        if (this.phaseTimer === null) return;
        window.clearInterval(this.phaseTimer);
        this.phaseTimer = null;
      },
    };
  }

  /**
   * Contexto Web Audio depois do `ensure`. Null até a cabine despertar o grafo.
   */
  audioContext(): AudioContext | null {
    return this.ctx;
  }

  async ensure(): Promise<void> {
    if (this.ctx) return;
    const ctx = this.createAudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.xfA = ctx.createGain();
    this.xfB = ctx.createGain();
    this.cueSum = ctx.createGain();
    this.cuePflGain = ctx.createGain();
    this.cueMasterGain = ctx.createGain();
    this.cueMixBus = ctx.createGain();
    this.headphonesGain = ctx.createGain();
    this.xfA.connect(this.master);
    this.xfB.connect(this.master);
    this.master.connect(ctx.destination);
    this.cueSum.connect(this.cuePflGain);
    this.master.connect(this.cueMasterGain);
    this.cuePflGain.connect(this.cueMixBus);
    this.cueMasterGain.connect(this.cueMixBus);
    this.cueMixBus.connect(this.headphonesGain);
    this.headphonesGain.connect(ctx.destination);
    this.decks = {
      a: new DeckNodes(ctx, this.xfA, this.cueSum),
      b: new DeckNodes(ctx, this.xfB, this.cueSum),
    };
    this.rebuildBuffer("a");
    this.rebuildBuffer("b");
    this.applyGains();
    this.applyCueRouting();
    this.applyDeck("a");
    this.applyDeck("b");
    this.startPhaseLoop();
  }

  /**
   * Aponta o bus de cue para um dispositivo de saída via `setSinkId`.
   *
   * @param deviceId Id do `enumerateDevices` ou `null` para voltar ao destino padrão.
   */
  async setCueSinkId(deviceId: string | null): Promise<void> {
    await this.ensure();
    if (!this.ctx || !this.headphonesGain) return;
    if (!deviceId) {
      this.headphonesGain.disconnect();
      this.headphonesGain.connect(this.ctx.destination);
      if (this.cueAudioEl) {
        this.cueAudioEl.pause();
        this.cueAudioEl.srcObject = null;
      }
      return;
    }
    if (!this.cueStreamDest) {
      this.cueStreamDest = this.ctx.createMediaStreamDestination();
      this.cueAudioEl = new Audio();
      this.cueAudioEl.srcObject = this.cueStreamDest.stream;
    }
    const cueDest = this.cueStreamDest;
    const cueAudio = this.cueAudioEl;
    if (!cueDest || !cueAudio) return;
    this.headphonesGain.disconnect();
    this.headphonesGain.connect(cueDest);
    await cueAudio.setSinkId(deviceId);
    await cueAudio.play();
  }

  analyser(id: DeckId): AnalyserNode | null {
    return this.decks?.[id].analyser ?? null;
  }

  effectiveBpm(id: DeckId): number {
    const deck = this.snapshot[id];
    return deck.bpm * (1 + deck.pitch / 100);
  }

  async toggle(id: DeckId): Promise<void> {
    await this.ensure();
    this.clearCuePreview(id);
    if (this.snapshot[id].playing) {
      this.stop(id);
      return;
    }
    this.start(id);
  }

  loadTrack(id: DeckId, trackId: string): void {
    const track = getTrainingTrack(trackId);
    if (!track) return;
    const wasPlaying = this.snapshot[id].playing;
    if (wasPlaying) this.stop(id);
    this.snapshot[id].track = track;
    this.snapshot[id].bpm = track.bpm;
    this.snapshot[id].pitch = 0;
    this.snapshot[id].cueBeat = 0;
    this.snapshot[id].phase = 0;
    this.snapshot[id].positionSec = 0;
    this.snapshot[id].sourceKind = "synthetic";
    this.snapshot[id].peaks = null;
    this.rebuildBuffer(id);
    if (this.snapshot[id].sync) this.applySync(id);
    if (wasPlaying) this.start(id);
  }

  /**
   * Carrega áudio já decodificado no deck, preservando playing se aplicável.
   *
   * @param id Deck destino.
   * @param buffer Buffer do Web Audio.
   * @param meta Título, BPM e key para a tela.
   */
  loadDeckBuffer(id: DeckId, buffer: AudioBuffer, meta: DeckFileMeta): void {
    const wasPlaying = this.snapshot[id].playing;
    if (wasPlaying) this.stop(id);
    if (this.decks) this.decks[id].buffer = buffer;
    const bpm = meta.bpm ?? this.snapshot[id].bpm;
    const key = meta.key ?? "—";
    this.snapshot[id].sourceKind = "file";
    this.snapshot[id].durationSec = buffer.duration;
    this.snapshot[id].positionSec = 0;
    this.snapshot[id].peaks =
      meta.peaks && meta.peaks.length > 0 ? meta.peaks : computePeaks(buffer, 512);
    this.snapshot[id].track = {
      id: `file:${meta.title}`,
      title: meta.title,
      artist: meta.artist ?? "Arquivo",
      genre: "Upload",
      bpm,
      key,
      scale: key,
      duration: formatTrackDuration(buffer.duration),
      grid: "FILE",
    };
    this.snapshot[id].bpm = bpm;
    this.snapshot[id].pitch = 0;
    this.snapshot[id].cueBeat = 0;
    this.snapshot[id].phase = 0;
    if (this.snapshot[id].sync) this.applySync(id);
    if (wasPlaying) this.start(id);
  }

  /**
   * Decodifica o arquivo e chama `loadDeckBuffer`.
   *
   * @param id Deck destino.
   * @param file Arquivo do picker.
   */
  async loadDeckFile(id: DeckId, file: File): Promise<void> {
    await this.ensure();
    if (!this.ctx) return;
    await this.ctx.resume();
    const decoded = await decodeDeckFile(this.ctx, file);
    this.loadDeckBuffer(id, decoded.buffer, {
      title: decoded.title,
      bpm: decoded.bpm,
      durationSec: decoded.durationSec,
    });
  }

  /**
   * Atualiza BPM, key ou título sem recarregar o áudio.
   *
   * @param id Deck.
   * @param meta Campos opcionais.
   */
  setDeckMeta(id: DeckId, meta: { bpm?: number; key?: string; title?: string }): void {
    if (meta.bpm !== undefined) {
      this.snapshot[id].bpm = meta.bpm;
      this.snapshot[id].track = { ...this.snapshot[id].track, bpm: meta.bpm };
    }
    if (meta.key !== undefined) {
      this.snapshot[id].track = { ...this.snapshot[id].track, key: meta.key, scale: meta.key };
    }
    if (meta.title !== undefined) {
      this.snapshot[id].track = { ...this.snapshot[id].track, title: meta.title };
    }
  }

  setPitch(id: DeckId, pitch: number): void {
    this.snapshot[id].pitch = pitch;
    if (this.snapshot[id].sync) this.applySync(id);
    const source = this.decks?.[id].source;
    if (source) source.playbackRate.value = 1 + this.snapshot[id].pitch / 100;
  }

  setEq(id: DeckId, band: keyof DeckState["eq"], value: number): void {
    this.snapshot[id].eq[band] = value;
    this.applyEq(id);
  }

  setTrim(id: DeckId, value: number): void {
    this.snapshot[id].trim = value;
    if (this.decks?.[id].trim) this.decks[id].trim.gain.value = value;
  }

  setFilter(id: DeckId, value: number): void {
    this.snapshot[id].filter = value;
    this.applyFilter(id);
  }

  setGain(id: DeckId, value: number): void {
    this.snapshot[id].gain = value;
    this.applyGains();
  }

  setCrossfader(value: number): void {
    this.snapshot.crossfader = value;
    this.applyGains();
  }

  setMaster(value: number): void {
    this.snapshot.master = value;
    if (this.master) this.master.gain.value = value;
  }

  setBooth(value: number): void {
    this.snapshot.booth = value;
    this.applyCueRouting();
  }

  setCueMix(value: number): void {
    this.snapshot.cueMix = value;
    this.applyCueRouting();
  }

  setMasterCue(enabled: boolean): void {
    this.snapshot.masterCue = enabled;
    this.applyCueRouting();
  }

  setSync(id: DeckId, enabled: boolean): void {
    this.snapshot[id].sync = enabled;
    if (enabled) this.applySync(id);
  }

  setMasterDeck(id: DeckId): void {
    this.snapshot.masterDeck = id;
    this.snapshot.a.masterTempo = id === "a";
    this.snapshot.b.masterTempo = id === "b";
    if (this.snapshot.a.sync) this.applySync("a");
    if (this.snapshot.b.sync) this.applySync("b");
  }

  setCueMonitor(id: DeckId, enabled: boolean): void {
    this.snapshot[id].cueMonitor = enabled;
    this.applyCueRouting();
  }

  setJogMode(id: DeckId, mode: JogMode): void {
    this.snapshot[id].jogMode = mode;
  }

  setQuantize(id: DeckId, enabled: boolean): void {
    this.snapshot[id].quantize = enabled;
  }

  setCueBeat(id: DeckId, beat: number): void {
    this.snapshot[id].cueBeat = this.quantizeBeat(id, beat);
  }

  callCue(id: DeckId): void {
    this.snapshot[id].phase = this.beatToPhase(id, this.snapshot[id].cueBeat);
    if (this.snapshot[id].playing) {
      this.restart(id);
    }
  }

  /**
   * Inicia o gesto momentâneo do CUE: se o deck toca, salta ao ponto de cue;
   * se está pausado, toca a partir do cue até o `releaseCue`.
   *
   * @param id Deck que recebeu o press do CUE.
   */
  pressCue(id: DeckId): void {
    if (this.snapshot[id].playing) {
      this.callCue(id);
      return;
    }
    const nodes = this.decks?.[id];
    if (nodes) nodes.cuePreview = true;
    this.snapshot[id].phase = this.beatToPhase(id, this.snapshot[id].cueBeat);
    this.start(id);
  }

  /**
   * Encerra o preview momentâneo do CUE e para o deck no ponto de cue.
   *
   * @param id Deck que soltou o CUE.
   */
  releaseCue(id: DeckId): void {
    const nodes = this.decks?.[id];
    if (!nodes?.cuePreview) return;
    nodes.cuePreview = false;
    const deck = this.snapshot[id];
    deck.phase = this.beatToPhase(id, deck.cueBeat);
    deck.positionSec = this.beatToSeconds(id, deck.cueBeat);
    this.stop(id, { preservePhase: true });
  }

  setHotCue(id: DeckId, slot: number): void {
    const cue = this.snapshot[id].hotCues.find((item) => item.slot === slot);
    if (!cue) return;
    cue.beat = this.phaseToBeat(id, this.snapshot[id].phase);
    cue.set = true;
  }

  triggerHotCue(id: DeckId, slot: number): void {
    const cue = this.snapshot[id].hotCues.find((item) => item.slot === slot);
    if (!cue || !cue.set) return;
    this.snapshot[id].phase = this.beatToPhase(id, cue.beat);
    if (!this.snapshot[id].playing) this.start(id);
    else this.restart(id);
  }

  toggleLoop(id: DeckId): void {
    const loop = this.snapshot[id].loop;
    if (!loop.active) {
      const beat = this.quantizeBeat(id, this.phaseToBeat(id, this.snapshot[id].phase));
      loop.inBeat = beat;
      loop.outBeat = beat + 4;
      loop.active = true;
      if (this.snapshot[id].playing) this.restart(id);
      return;
    }
    loop.active = false;
    loop.inBeat = null;
    loop.outBeat = null;
    if (this.snapshot[id].playing) this.restart(id);
  }

  /**
   * Grava o ponto de loop IN na posição atual, quantizado se o flag estiver ligado.
   *
   * @param id Deck que recebeu LOOP IN.
   */
  setLoopIn(id: DeckId): void {
    const loop = this.snapshot[id].loop;
    loop.inBeat = this.quantizeBeat(id, this.phaseToBeat(id, this.snapshot[id].phase));
    if (loop.outBeat !== null && loop.outBeat <= loop.inBeat) {
      loop.outBeat = loop.inBeat + 4;
    }
    loop.active = true;
    if (this.snapshot[id].playing) this.restart(id);
  }

  /**
   * Grava o ponto de loop OUT na posição atual, quantizado se o flag estiver ligado.
   *
   * @param id Deck que recebeu LOOP OUT.
   */
  setLoopOut(id: DeckId): void {
    const loop = this.snapshot[id].loop;
    const beat = this.quantizeBeat(id, this.phaseToBeat(id, this.snapshot[id].phase));
    loop.outBeat = beat;
    if (loop.inBeat === null) {
      loop.inBeat = Math.max(0, beat - 4);
    }
    if (loop.outBeat <= loop.inBeat) {
      loop.outBeat = loop.inBeat + 4;
    }
    loop.active = true;
    if (this.snapshot[id].playing) this.restart(id);
  }

  /**
   * Encolhe o loop ativo pela metade, mantendo o ponto IN.
   *
   * @param id Deck com loop ligado.
   */
  loopHalve(id: DeckId): void {
    const loop = this.snapshot[id].loop;
    if (!loop.active || loop.inBeat === null || loop.outBeat === null) return;
    const span = loop.outBeat - loop.inBeat;
    loop.outBeat = loop.inBeat + span / 2;
    if (this.snapshot[id].playing) this.restart(id);
  }

  /**
   * Dobra a duração do loop ativo a partir do ponto IN.
   *
   * @param id Deck com loop ligado.
   */
  loopDouble(id: DeckId): void {
    const loop = this.snapshot[id].loop;
    if (!loop.active || loop.inBeat === null || loop.outBeat === null) return;
    const span = loop.outBeat - loop.inBeat;
    loop.outBeat = loop.inBeat + span * 2;
    if (this.snapshot[id].playing) this.restart(id);
  }

  /**
   * Liga um loop de N beats a partir da posição atual.
   *
   * @param id Deck destino.
   * @param beats Duração do loop em beats.
   */
  setBeatLoop(id: DeckId, beats: number): void {
    const loop = this.snapshot[id].loop;
    const inBeat = this.quantizeBeat(id, this.phaseToBeat(id, this.snapshot[id].phase));
    loop.inBeat = inBeat;
    loop.outBeat = inBeat + beats;
    loop.active = true;
    if (this.snapshot[id].playing) this.restart(id);
  }

  /**
   * Salta o playhead N beats à frente ou para trás.
   *
   * @param id Deck a mover.
   * @param beats Delta em beats, positivo ou negativo.
   */
  jumpBeats(id: DeckId, beats: number): void {
    const deck = this.snapshot[id];
    const current = this.phaseToBeat(id, deck.phase);
    const next = Math.max(0, current + beats);
    deck.phase = this.beatToPhase(id, next);
    deck.positionSec = this.beatToSeconds(id, next);
    if (deck.playing) this.restart(id);
  }

  /**
   * Marca o início de um gesto de scratch vinyl no prato.
   *
   * @param id Deck cujo prato foi tocado.
   */
  scratchBegin(id: DeckId): void {
    const nodes = this.decks?.[id];
    if (nodes) nodes.scratching = true;
  }

  /**
   * Desloca o playhead durante o scratch vinyl.
   *
   * @param id Deck em scratch.
   * @param delta Deslocamento relativo do prato.
   */
  scratchTick(id: DeckId, delta: number): void {
    const nodes = this.decks?.[id];
    if (!nodes?.scratching || this.snapshot[id].jogMode !== "vinyl") return;
    this.seek(id, this.snapshot[id].phase + delta);
  }

  /**
   * Encerra o gesto de scratch vinyl.
   *
   * @param id Deck que soltou o prato.
   */
  scratchEnd(id: DeckId): void {
    const nodes = this.decks?.[id];
    if (nodes) nodes.scratching = false;
  }

  /**
   * Reposiciona o playhead na fase indicada e reinicia o source se necessário.
   *
   * @param id Deck a reposicionar.
   * @param phase Posição normalizada de 0 a 1.
   */
  seek(id: DeckId, phase: number): void {
    const deck = this.snapshot[id];
    deck.phase = ((phase % 1) + 1) % 1;
    deck.positionSec = deck.phase * (deck.durationSec || this.decks?.[id].buffer?.duration || 1);
    if (deck.playing) this.restart(id);
  }

  nudge(id: DeckId, direction: -1 | 1): void {
    const deck = this.snapshot[id];
    const nodes = this.decks?.[id];
    if (deck.jogMode === "vinyl" && nodes?.scratching) {
      this.scratchTick(id, direction * 0.0035);
      return;
    }
    const bump = direction * (deck.jogMode === "vinyl" ? 0.035 : 0.018);
    deck.phase = (deck.phase + bump + 1) % 1;
    const source = nodes?.source;
    if (source) {
      const rate = 1 + deck.pitch / 100 + direction * 0.04;
      source.playbackRate.value = rate;
      window.setTimeout(() => {
        if (source.playbackRate) source.playbackRate.value = 1 + deck.pitch / 100;
      }, 120);
    }
  }

  /**
   * Arredonda um beat ao grid quando o quantize do deck está ligado.
   *
   * @param id Deck consultado.
   * @param beat Valor bruto em beats ou segundos.
   */
  private quantizeBeat(id: DeckId, beat: number): number {
    const deck = this.snapshot[id];
    if (!deck.quantize) return beat;
    if (deck.sourceKind === "file") {
      const beatSec = 60 / deck.bpm;
      return Math.round(beat / beatSec) * beatSec;
    }
    return Math.round(beat);
  }

  private beatToPhase(id: DeckId, beat: number): number {
    const deck = this.snapshot[id];
    if (deck.sourceKind === "file") {
      const duration = deck.durationSec || 1;
      return duration > 0 ? ((beat / duration) % 1 + 1) % 1 : 0;
    }
    return (beat % 8) / 8;
  }

  private phaseToBeat(id: DeckId, phase: number): number {
    const deck = this.snapshot[id];
    if (deck.sourceKind === "file") {
      return phase * (deck.durationSec || 0);
    }
    return Math.round(phase * 8) % 8;
  }

  private applySync(id: DeckId): void {
    const master = this.snapshot[this.snapshot.masterDeck];
    const target = master.bpm;
    const deck = this.snapshot[id];
    deck.pitch = ((target / deck.bpm) - 1) * 100;
    const source = this.decks?.[id].source;
    if (source) source.playbackRate.value = 1 + deck.pitch / 100;
  }

  private applyEq(id: DeckId): void {
    const nodes = this.decks?.[id];
    const deck = this.snapshot[id];
    if (!nodes) return;
    nodes.high.gain.value = deck.eq.high;
    nodes.mid.gain.value = deck.eq.mid;
    nodes.low.gain.value = deck.eq.low;
  }

  private applyFilter(id: DeckId): void {
    const nodes = this.decks?.[id];
    if (!nodes) return;
    const value = this.snapshot[id].filter;
    if (value === 0) {
      nodes.filter.type = "lowpass";
      nodes.filter.frequency.value = 20000;
      return;
    }
    if (value < 0) {
      nodes.filter.type = "lowpass";
      nodes.filter.frequency.value = 180 + (1 + value / 100) * 4800;
      return;
    }
    nodes.filter.type = "highpass";
    nodes.filter.frequency.value = 80 + (value / 100) * 4200;
  }

  private applyDeck(id: DeckId): void {
    this.setTrim(id, this.snapshot[id].trim);
    this.applyEq(id);
    this.applyFilter(id);
  }

  private rebuildBuffer(id: DeckId): void {
    if (!this.ctx || !this.decks) return;
    this.decks[id].buffer = buildLoop(this.ctx, this.snapshot[id].bpm, id);
    this.snapshot[id].durationSec = this.decks[id].buffer.duration;
    if (this.decks[id].source) {
      this.decks[id].source!.buffer = this.decks[id].buffer;
    }
  }

  /**
   * Diz se o deck deve repetir o buffer no `BufferSource`.
   *
   * O loop sintético de treino repete os 8 beats para sempre, ao passo que um
   * arquivo real só volta quando o DJ liga o loop de 4 beats na controladora.
   *
   * @param id Deck consultado.
   */
  private shouldLoopBuffer(id: DeckId): boolean {
    const deck = this.snapshot[id];
    if (deck.loop.active) return true;
    return deck.sourceKind === "synthetic";
  }

  /**
   * Converte beat ou segundo de cue em segundos absolutos no buffer.
   *
   * @param id Deck consultado.
   * @param beat Valor do cue ou do loop IN/OUT.
   */
  private beatToSeconds(id: DeckId, beat: number): number {
    const deck = this.snapshot[id];
    if (deck.sourceKind === "file") return Math.max(0, beat);
    const duration = deck.durationSec || this.decks?.[id].buffer?.duration || 1;
    return ((beat % 8) / 8) * duration;
  }

  /**
   * Aplica `loopStart` e `loopEnd` quando o loop de 4 beats está ativo num arquivo.
   *
   * @param id Deck que toca.
   * @param source `BufferSource` recém-criado.
   */
  private applyLoopRegion(id: DeckId, source: AudioBufferSourceNode): void {
    const deck = this.snapshot[id];
    const duration = this.decks?.[id].buffer?.duration ?? deck.durationSec;
    if (!deck.loop.active || deck.loop.inBeat === null || deck.loop.outBeat === null) return;
    const loopStart = this.beatToSeconds(id, deck.loop.inBeat);
    const loopEnd = Math.min(duration, this.beatToSeconds(id, deck.loop.outBeat));
    source.loopStart = loopStart;
    source.loopEnd = Math.max(loopStart + 0.05, loopEnd);
  }

  /**
   * Para o deck quando o buffer de arquivo chega ao fim sem loop.
   *
   * @param id Deck que terminou.
   * @param source Instância que disparou o `ended`.
   */
  private handleFileEnded(id: DeckId, source: AudioBufferSourceNode): void {
    const nodes = this.decks?.[id];
    if (!nodes || nodes.source !== source) return;
    nodes.source.disconnect();
    nodes.source = null;
    this.snapshot[id].playing = false;
    this.snapshot[id].phase = 0;
    this.snapshot[id].positionSec = 0;
  }

  /**
   * Arranca o BufferSource no `snapshot.phase` corrente.
   *
   * O `stop` interno não captura a fase, porque o ponto de partida já está
   * no snapshot: pause gravou, `callCue` escreveu o cue, load zerou.
   *
   * @param id Deck a tocar.
   */
  private start(id: DeckId): void {
    if (!this.ctx || !this.decks) return;
    this.stop(id, { preservePhase: true });
    const nodes = this.decks[id];
    if (!nodes.buffer) return;
    const deck = this.snapshot[id];
    const source = this.ctx.createBufferSource();
    source.buffer = nodes.buffer;
    source.loop = this.shouldLoopBuffer(id);
    this.applyLoopRegion(id, source);
    source.playbackRate.value = 1 + deck.pitch / 100;
    source.connect(nodes.trim);
    const duration = nodes.buffer.duration;
    const offset = Math.min(duration * deck.phase, Math.max(0, duration - 0.01));
    source.start(0, offset);
    if (deck.sourceKind === "file" && !source.loop) {
      source.onended = () => this.handleFileEnded(id, source);
    }
    nodes.source = source;
    nodes.startedAt = this.ctx.currentTime - offset / source.playbackRate.value;
    deck.playing = true;
  }

  /**
   * Recria o source no ponto já escrito em `snapshot.phase`.
   *
   * @param id Deck a reiniciar.
   */
  private restart(id: DeckId): void {
    if (this.snapshot[id].playing) this.start(id);
  }

  /**
   * Limpa o flag de preview do CUE sem parar o deck.
   *
   * @param id Deck cujo preview deve ser descartado.
   */
  private clearCuePreview(id: DeckId): void {
    const nodes = this.decks?.[id];
    if (nodes) nodes.cuePreview = false;
  }

  /**
   * Para o source. Sem `preservePhase`, grava a fase viva no snapshot.
   *
   * O `startedAt` já inclui o offset do start, e por isso a fase viva é só
   * `elapsed * rate / duration`. Somar `snapshot.phase` de novo duplicava o
   * ponto e o `callCue` em play voltava ao lugar antigo em vez do cue.
   *
   * @param id Deck a parar.
   * @param options `preservePhase` true quando o caller já definiu o ponto
   *   (start/restart). Omitido no pause via `toggle`.
   */
  private stop(id: DeckId, options: { preservePhase?: boolean } = {}): void {
    const nodes = this.decks?.[id];
    if (!options.preservePhase && nodes) nodes.cuePreview = false;
    if (nodes?.source && this.ctx) {
      if (!options.preservePhase) {
        const elapsed = this.ctx.currentTime - nodes.startedAt;
        const rate = 1 + this.snapshot[id].pitch / 100;
        const loopDuration = nodes.buffer?.duration ?? 1;
        const progress = (elapsed * rate) / loopDuration;
        nodes.pausedPhase = this.shouldLoopBuffer(id)
          ? progress % 1
          : Math.min(1, progress);
        this.snapshot[id].phase = nodes.pausedPhase;
        this.snapshot[id].positionSec = nodes.pausedPhase * loopDuration;
      }
      nodes.source.stop();
      nodes.source.disconnect();
      nodes.source = null;
    }
    this.snapshot[id].playing = false;
  }

  private startPhaseLoop(): void {
    if (this.phaseTimer !== null) return;
    this.phaseTimer = window.setInterval(() => {
      if (!this.ctx || !this.decks) return;
      (["a", "b"] as const).forEach((id) => {
        const deck = this.snapshot[id];
        const nodes = this.decks![id];
        if (!deck.playing || !nodes.source) return;
        const elapsed = this.ctx!.currentTime - nodes.startedAt;
        const rate = 1 + deck.pitch / 100;
        const loopDuration = nodes.buffer?.duration ?? 1;
        const progress = (elapsed * rate) / loopDuration;
        if (deck.sourceKind === "file" && !this.shouldLoopBuffer(id)) {
          if (progress >= 1) {
            this.stop(id);
            deck.phase = 0;
            deck.positionSec = 0;
            return;
          }
          deck.phase = progress;
          deck.positionSec = progress * loopDuration;
        } else {
          deck.phase = progress % 1;
          deck.positionSec = deck.phase * loopDuration;
        }
        deck.durationSec = loopDuration;
      });
    }, 50);
  }

  private applyGains(): void {
    const x = this.snapshot.crossfader;
    const a = Math.cos((x * Math.PI) / 2);
    const b = Math.sin((x * Math.PI) / 2);
    if (this.decks) {
      this.decks.a.gain.gain.value = this.snapshot.a.gain * a;
      this.decks.b.gain.gain.value = this.snapshot.b.gain * b;
    }
    if (this.master) this.master.gain.value = this.snapshot.master;
    this.applyCueRouting();
  }

  /**
   * Atualiza o bus de cue, o blend cue/master e o volume de fone.
   */
  private applyCueRouting(): void {
    if (!this.decks) return;
    const x = this.snapshot.crossfader;
    const xfA = Math.cos((x * Math.PI) / 2);
    const xfB = Math.sin((x * Math.PI) / 2);

    (["a", "b"] as const).forEach((id) => {
      const deck = this.snapshot[id];
      const nodes = this.decks![id];
      const xf = id === "a" ? xfA : xfB;
      nodes.cueSend.gain.value = deck.cueMonitor ? deck.gain * xf : 0;
    });

    if (!this.cuePflGain || !this.cueMasterGain || !this.headphonesGain) return;

    if (this.snapshot.masterCue) {
      this.cuePflGain.gain.value = 0;
      this.cueMasterGain.gain.value = 1;
    } else {
      this.cuePflGain.gain.value = 1 - this.snapshot.cueMix;
      this.cueMasterGain.gain.value = this.snapshot.cueMix;
    }
    this.headphonesGain.gain.value = this.snapshot.booth;
  }
}

export const engine = new MamuteEngine();

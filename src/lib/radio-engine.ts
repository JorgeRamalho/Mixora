import type { RadioEqBandId, RadioEqLevels, RadioEngineState } from "../types/radio";

const DEFAULT_EQ: RadioEqLevels = {
  sub: 0.52,
  low: 0.5,
  mid: 0.48,
  high: 0.54,
  air: 0.5,
};

function eqGain(value: number): number {
  return (value - 0.5) * 24;
}

type Listener = (state: RadioEngineState) => void;

export class RadioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sub: BiquadFilterNode | null = null;
  private low: BiquadFilterNode | null = null;
  private mid: BiquadFilterNode | null = null;
  private high: BiquadFilterNode | null = null;
  private air: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private tickTimer: number | null = null;
  private listeners = new Set<Listener>();
  private eq: RadioEqLevels = { ...DEFAULT_EQ };
  private startedAt = 0;
  private pausedAt = 0;

  state: RadioEngineState = {
    playing: false,
    loopActive: true,
    loopStart: 0,
    loopEnd: 0,
    uploadId: null,
    durationSec: 0,
    positionSec: 0,
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }

  async ensure(): Promise<AudioContext> {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.sub = ctx.createBiquadFilter();
    this.low = ctx.createBiquadFilter();
    this.mid = ctx.createBiquadFilter();
    this.high = ctx.createBiquadFilter();
    this.air = ctx.createBiquadFilter();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;

    this.sub.type = "lowshelf";
    this.sub.frequency.value = 60;
    this.low.type = "peaking";
    this.low.frequency.value = 250;
    this.low.Q.value = 0.9;
    this.mid.type = "peaking";
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 0.85;
    this.high.type = "peaking";
    this.high.frequency.value = 4000;
    this.high.Q.value = 0.85;
    this.air.type = "highshelf";
    this.air.frequency.value = 12000;

    this.sub.connect(this.low);
    this.low.connect(this.mid);
    this.mid.connect(this.high);
    this.high.connect(this.air);
    this.air.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this.master.gain.value = 0.88;
    this.applyEq();
    this.startTick();
    return ctx;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  setEq(band: RadioEqBandId, value: number): void {
    this.eq[band] = value;
    this.applyEq();
  }

  setEqAll(levels: RadioEqLevels): void {
    this.eq = { ...levels };
    this.applyEq();
  }

  private applyEq(): void {
    if (!this.sub || !this.low || !this.mid || !this.high || !this.air) return;
    this.sub.gain.value = eqGain(this.eq.sub);
    this.low.gain.value = eqGain(this.eq.low);
    this.mid.gain.value = eqGain(this.eq.mid);
    this.high.gain.value = eqGain(this.eq.high);
    this.air.gain.value = eqGain(this.eq.air);
  }

  async loadBuffer(uploadId: string, data: ArrayBuffer): Promise<void> {
    const ctx = await this.ensure();
    this.stopInternal(false);
    this.buffer = await ctx.decodeAudioData(data.slice(0));
    this.state.uploadId = uploadId;
    this.state.durationSec = this.buffer.duration;
    this.state.loopStart = 0;
    this.state.loopEnd = this.buffer.duration;
    this.state.positionSec = 0;
    this.pausedAt = 0;
    this.emit();
  }

  async togglePlay(): Promise<void> {
    await this.ensure();
    if (this.state.playing) {
      this.pause();
      return;
    }
    this.play();
  }

  play(): void {
    if (!this.ctx || !this.buffer) return;
    this.stopInternal(false);
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.sub!);
    source.loop = this.state.loopActive;
    source.loopStart = this.state.loopStart;
    source.loopEnd = Math.max(this.state.loopStart + 0.05, this.state.loopEnd);
    const offset = Math.min(this.pausedAt, this.buffer.duration - 0.01);
    source.start(0, offset);
    this.source = source;
    this.startedAt = this.ctx.currentTime - offset;
    this.state.playing = true;
    this.state.positionSec = offset;
    source.onended = () => {
      if (!this.state.loopActive) {
        this.state.playing = false;
        this.state.positionSec = 0;
        this.pausedAt = 0;
        this.source = null;
        this.emit();
      }
    };
    this.emit();
  }

  pause(): void {
    if (!this.ctx || !this.source) {
      this.state.playing = false;
      this.emit();
      return;
    }
    this.pausedAt = this.ctx.currentTime - this.startedAt;
    if (this.buffer) {
      this.pausedAt = Math.min(this.pausedAt, this.buffer.duration);
      this.state.positionSec = this.pausedAt;
    }
    this.stopInternal(false);
    this.state.playing = false;
    this.emit();
  }

  stop(): void {
    this.stopInternal(true);
    this.emit();
  }

  private stopInternal(resetPosition: boolean): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
      this.source = null;
    }
    this.state.playing = false;
    if (resetPosition) {
      this.pausedAt = 0;
      this.state.positionSec = 0;
    }
  }

  setLoop(active: boolean): void {
    this.state.loopActive = active;
    if (this.buffer && this.state.loopEnd <= this.state.loopStart) {
      this.state.loopEnd = this.buffer.duration;
    }
    if (this.state.playing) this.play();
    else this.emit();
  }

  setLoopRegion(start: number, end: number): void {
    if (!this.buffer) return;
    const duration = this.buffer.duration;
    const loopStart = Math.max(0, Math.min(start, duration - 0.05));
    const loopEnd = Math.max(loopStart + 0.05, Math.min(end, duration));
    this.state.loopStart = loopStart;
    this.state.loopEnd = loopEnd;
    if (this.state.playing) this.play();
    else this.emit();
  }

  private startTick(): void {
    if (this.tickTimer !== null) return;
    this.tickTimer = window.setInterval(() => {
      if (!this.ctx || !this.state.playing || !this.buffer) return;
      let pos = this.ctx.currentTime - this.startedAt;
      if (this.state.loopActive) {
        const span = this.state.loopEnd - this.state.loopStart;
        if (span > 0) {
          pos = this.state.loopStart + ((pos - this.state.loopStart) % span);
        }
      } else {
        pos = Math.min(pos, this.buffer.duration);
      }
      this.state.positionSec = pos;
      this.emit();
    }, 120);
  }
}

export const radioEngine = new RadioEngine();

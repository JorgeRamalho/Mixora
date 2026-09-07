import type { RadioClip } from "../types/radio";
import { ELECTRONIC_LIVE_STREAMS, liveStreamUrls } from "./radio-electronic-feed";

export type RadioMp3Snapshot = {
  clip: RadioClip | null;
  clips: RadioClip[];
  playing: boolean;
  catalogReady: boolean;
  random: true;
};

type Listener = (snapshot: RadioMp3Snapshot) => void;

const UNLOCK_EVENTS = ["pointerdown", "touchstart", "keydown", "click"] as const;

function isPlayableMp3(clip: RadioClip): boolean {
  return Boolean(clip.previewUrl);
}

function shuffleClips(items: RadioClip[]): RadioClip[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = next[i]!;
    next[i] = next[j]!;
    next[j] = current;
  }
  return next;
}

export class RadioMp3Station {
  readonly element: HTMLAudioElement;
  private clips: RadioClip[] = [];
  private index = 0;
  private playing = false;
  private catalogReady = false;
  private failStreak = 0;
  private listeners = new Set<Listener>();
  private advancing = false;
  private currentUrl = "";
  private mirrorIndex = 0;
  private gestureArmed = false;
  private unlockHandler: (() => void) | null = null;
  private userPaused = false;

  constructor() {
    const audio = new Audio();
    audio.preload = "auto";
    audio.autoplay = true;
    audio.controls = false;
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("controlslist", "nodownload noplaybackrate");
    audio.setAttribute("data-radio-mp3", "true");
    audio.className = "radio-mp3-el";
    audio.addEventListener("playing", () => {
      this.playing = true;
      this.failStreak = 0;
      if (!this.element.muted) this.disarmGestureUnlock();
      this.emit();
    });
    audio.addEventListener("pause", () => {
      this.playing = false;
      this.emit();
    });
    audio.addEventListener("ended", () => {
      this.failStreak = 0;
      void this.advanceRandom(true);
    });
    audio.addEventListener("error", () => {
      if (this.advancing) return;
      this.failStreak += 1;
      const clip = this.clips[this.index];
      if (clip && this.tryNextMirror(clip)) {
        void this.playCurrent();
        return;
      }
      void this.advanceRandom(true);
    });
    this.element = audio;
    this.clips = shuffleClips([...ELECTRONIC_LIVE_STREAMS]);
    this.index = this.randomIndex();
    this.catalogReady = false;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): RadioMp3Snapshot {
    return {
      clip: this.clips[this.index] ?? null,
      clips: this.clips,
      playing: this.playing,
      catalogReady: this.catalogReady,
      random: true,
    };
  }

  setPlaylist(next: RadioClip[]): void {
    const playable = shuffleClips(next.filter(isPlayableMp3));
    if (playable.length === 0) return;

    const wasPlaying = this.playing && !this.element.paused;
    const currentId = this.clips[this.index]?.id;
    this.clips = playable;

    if (wasPlaying && currentId) {
      const keep = playable.findIndex((clip) => clip.id === currentId);
      this.index = keep >= 0 ? keep : this.randomIndex();
    } else {
      this.index = this.randomIndex();
    }

    this.catalogReady = true;
    this.emit();
  }

  ensurePlaylist(next: RadioClip[]): void {
    if (this.catalogReady && this.clips.length > 1) {
      this.emit();
      return;
    }
    this.setPlaylist(next);
  }

  markCatalogReady(): void {
    this.catalogReady = true;
    this.emit();
  }

  async boot(): Promise<void> {
    this.armGestureUnlock();
    if (this.userPaused) return;
    if (this.playing && !this.element.paused && !this.element.muted) return;
    await this.start();
  }

  async start(): Promise<void> {
    this.userPaused = false;
    if (!this.clips[this.index]) this.index = this.randomIndex();
    await this.playCurrent();
  }

  pause(): void {
    this.userPaused = true;
    this.element.pause();
    this.playing = false;
    this.emit();
  }

  async toggle(): Promise<void> {
    if (this.playing && !this.element.paused) {
      this.pause();
      return;
    }
    await this.start();
  }

  async playClip(clipId: string): Promise<void> {
    const nextIndex = this.clips.findIndex((clip) => clip.id === clipId);
    if (nextIndex < 0) return;
    this.index = nextIndex;
    this.mirrorIndex = 0;
    await this.playCurrent();
  }

  async advance(_delta: 1 | -1, autoplay: boolean): Promise<void> {
    await this.advanceRandom(autoplay);
  }

  private async advanceRandom(autoplay: boolean): Promise<void> {
    if (this.advancing) return;
    if (this.clips.length === 0) return;

    this.advancing = true;
    this.index = this.randomIndex(this.index);
    this.mirrorIndex = 0;
    this.emit();

    try {
      if (autoplay) {
        if (this.failStreak > Math.max(3, this.clips.length)) {
          this.failStreak = 0;
          this.pause();
          return;
        }
        await this.playCurrent();
      }
    } finally {
      this.advancing = false;
    }
  }

  private randomIndex(exclude?: number): number {
    if (this.clips.length <= 1) return 0;
    let next = Math.floor(Math.random() * this.clips.length);
    let attempts = 0;
    while (next === exclude && attempts < 12) {
      next = Math.floor(Math.random() * this.clips.length);
      attempts += 1;
    }
    return next;
  }

  private tryNextMirror(clip: RadioClip): boolean {
    const urls = liveStreamUrls(clip);
    if (this.mirrorIndex + 1 >= urls.length) return false;
    this.mirrorIndex += 1;
    return true;
  }

  private armGestureUnlock(): void {
    if (this.gestureArmed || typeof document === "undefined") return;
    this.gestureArmed = true;
    const unlock = () => {
      if (this.userPaused) return;
      if (this.playing && !this.element.paused) {
        this.element.muted = false;
        this.disarmGestureUnlock();
        return;
      }
      this.element.muted = false;
      void this.start();
    };
    this.unlockHandler = unlock;
    for (const event of UNLOCK_EVENTS) {
      document.addEventListener(event, unlock, { capture: true });
    }
  }

  private disarmGestureUnlock(): void {
    const unlock = this.unlockHandler;
    if (!unlock) return;
    for (const event of UNLOCK_EVENTS) {
      document.removeEventListener(event, unlock, { capture: true });
    }
    this.unlockHandler = null;
    this.gestureArmed = false;
  }

  private async playCurrent(): Promise<void> {
    const clip = this.clips[this.index];
    const urls = clip ? liveStreamUrls(clip) : [];
    const url = urls[this.mirrorIndex] ?? clip?.previewUrl;
    if (!clip || !url) {
      if (!this.advancing && this.clips.length > 0) {
        await this.advanceRandom(true);
      }
      return;
    }

    if (this.currentUrl !== url) {
      this.currentUrl = url;
      this.element.src = url;
    }

    try {
      this.element.muted = false;
      await this.element.play();
      this.playing = true;
      this.failStreak = 0;
      this.emit();
    } catch (error) {
      this.playing = false;
      this.emit();
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        this.armGestureUnlock();
        try {
          this.element.muted = true;
          await this.element.play();
          this.playing = true;
          this.emit();
        } catch {
          /* o primeiro clique na página destrava o som */
        }
        return;
      }
      this.failStreak += 1;
      if (this.tryNextMirror(clip)) {
        await this.playCurrent();
        return;
      }
      if (this.failStreak <= this.clips.length) {
        this.advancing = false;
        await this.advanceRandom(true);
      }
    }
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) listener(snap);
  }
}

export const radioMp3Station = new RadioMp3Station();

export function bootRadioOnLaunch(): void {
  void radioMp3Station.boot();
}

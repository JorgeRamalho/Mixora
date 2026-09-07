import type { PlatformId } from "./platform";

export interface RadioClip {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  duration: string;
  youtubeId: string;
  previewUrl?: string;
  sourceUrl?: string;
  importedAt?: number;
  caption: string;
  platform: PlatformId;
}

export interface RadioUpload {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  createdAt: number;
  sizeBytes: number;
}

export type RadioEqBandId = "sub" | "low" | "mid" | "high" | "air";

export interface RadioEqBand {
  id: RadioEqBandId;
  label: string;
  hz: string;
}

export type RadioEqLevels = Record<RadioEqBandId, number>;

export interface RadioEngineState {
  playing: boolean;
  loopActive: boolean;
  loopStart: number;
  loopEnd: number;
  uploadId: string | null;
  durationSec: number;
  positionSec: number;
}

export type RadioSource =
  | { kind: "clip"; clip: RadioClip; continuous: boolean; autoplay: boolean }
  | { kind: "upload"; upload: RadioUpload };

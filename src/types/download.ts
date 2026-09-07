export type DownloadOsFamily = "windows" | "macos" | "linux" | "android" | "ios";

export type DownloadArch = "x64" | "arm64" | "universal";

export type DownloadPackId =
  | "windows-x64"
  | "windows-arm64"
  | "macos-arm64"
  | "macos-x64"
  | "linux-x64"
  | "linux-arm64"
  | "android"
  | "ios";

export type DownloadWizardStep = 1 | 2 | 3 | 4 | 5;

export type DownloadDocId =
  | "mixer"
  | "dj-online"
  | "harmonia"
  | "academia"
  | "plataformas"
  | "area-dj"
  | "visor"
  | "midi";

export interface DownloadDocSection {
  heading: string;
  body: readonly string[];
}

export interface DownloadDoc {
  id: DownloadDocId;
  title: string;
  mode: string;
  route: string;
  accent: string;
  fileName: string;
  summary: string;
  audience: string;
  sections: readonly DownloadDocSection[];
}

export interface DownloadPack {
  id: DownloadPackId;
  family: DownloadOsFamily;
  arch: DownloadArch;
  name: string;
  short: string;
  accent: string;
  fileName: string;
  fileKind: string;
  summary: string;
  requirements: string;
  installSteps: readonly string[];
}

export interface DetectedClient {
  family: DownloadOsFamily | "unknown";
  arch: DownloadArch | "unknown";
  packId: DownloadPackId | null;
  label: string;
}

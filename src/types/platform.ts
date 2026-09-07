export type PlatformId =
  | "mamute"
  | "beatport"
  | "soundcloud"
  | "deezer"
  | "spotify"
  | "youtube";

export interface PlatformIntel {
  id: PlatformId;
  name: string;
  role: string;
  accent: string;
  summary: string;
  capabilities: string[];
  limits: string[];
  playerDjUse: string;
  docsUrl: string;
  partnerUrl?: string;
}

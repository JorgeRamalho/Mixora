import type { DjProfile, ExperienceLevel, HardwareKind } from "../types";

export const HARDWARE_LABELS: Record<HardwareKind, string> = {
  cdj: "CDJ",
  controladora: "Controladora",
  mixer: "Mixer",
  "toca-discos": "Toca-discos",
};

export const SOCIAL_FIELDS = [
  { key: "instagram", label: "Instagram" },
  { key: "soundcloud", label: "SoundCloud" },
  { key: "mixcloud", label: "Mixcloud" },
  { key: "beatport", label: "Beatport" },
  { key: "spotify", label: "Spotify" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "deezer", label: "Deezer" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<
    DjProfile,
    "instagram" | "soundcloud" | "mixcloud" | "beatport" | "spotify" | "youtube" | "tiktok" | "deezer"
  >;
  label: string;
}>;

export function artistInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DJ";
  const first = parts[0] ?? "D";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return `${first[0] ?? "D"}${last[0] ?? "J"}`.toUpperCase();
}

export function experienceLabel(level: ExperienceLevel): string {
  switch (level) {
    case "iniciante":
      return "Iniciante";
    case "intermediario":
      return "Intermediário";
    case "avancado":
      return "Avançado";
    case "profissional":
      return "Profissional";
    default: {
      const _never: never = level;
      return _never;
    }
  }
}

export function venueLabel(venue: string): string {
  switch (venue) {
    case "clube":
      return "Clube";
    case "festival":
      return "Festival";
    case "radio":
      return "Rádio";
    case "streaming":
      return "Live stream";
    case "casamento":
      return "Open format / festa";
    default:
      return venue;
  }
}

export function travelLabel(travel: string): string {
  switch (travel) {
    case "local":
      return "Só local";
    case "nacional":
      return "Nacional";
    case "internacional":
      return "Internacional";
    default:
      return travel;
  }
}

export function formatBirthDate(value: string): string {
  if (!value.trim()) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
}

export function socialHref(key: (typeof SOCIAL_FIELDS)[number]["key"], value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const handle = trimmed.replace(/^@/, "");
  switch (key) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "soundcloud":
      return trimmed.includes(".") ? `https://${trimmed.replace(/^https?:\/\//i, "")}` : `https://soundcloud.com/${handle}`;
    case "mixcloud":
      return trimmed.includes(".") ? `https://${trimmed.replace(/^https?:\/\//i, "")}` : `https://mixcloud.com/${handle}`;
    case "youtube":
      return trimmed.includes(".") ? `https://${trimmed.replace(/^https?:\/\//i, "")}` : `https://youtube.com/@${handle}`;
    case "spotify":
    case "beatport":
    case "deezer":
      return trimmed.includes(".") ? `https://${trimmed.replace(/^https?:\/\//i, "")}` : null;
    default: {
      const _never: never = key;
      return _never;
    }
  }
}

export function hasText(value: string): boolean {
  return value.trim().length > 0;
}

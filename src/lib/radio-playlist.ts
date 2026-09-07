import type { PlatformId } from "../types/platform";
import type { RadioClip } from "../types/radio";
import { RADIO_PLATFORM_ORDER } from "../data/radio";

export function isPlayableClip(clip: RadioClip): boolean {
  return Boolean(clip.previewUrl);
}

function clipPlaybackRank(clip: RadioClip): number {
  if (clip.previewUrl) return 2;
  if (clip.youtubeId) return 1;
  return 0;
}

export function getPlayableClips(clips: RadioClip[]): RadioClip[] {
  return clips.filter(isPlayableClip);
}

/** Ordem editorial da rádio: alterna Spotify → SoundCloud → YouTube Music → Beatport → Deezer. */
export function buildRadioProgramming(clips: RadioClip[]): RadioClip[] {
  const groups = RADIO_PLATFORM_ORDER.map((platformId) =>
    clips
      .filter((clip) => clip.platform === platformId && isPlayableClip(clip))
      .sort((a, b) => clipPlaybackRank(b) - clipPlaybackRank(a)),
  );
  const maxLen = Math.max(0, ...groups.map((group) => group.length));
  const programming: RadioClip[] = [];

  for (let index = 0; index < maxLen; index += 1) {
    for (const group of groups) {
      const clip = group[index];
      if (clip) programming.push(clip);
    }
  }

  return programming;
}

function programmingPool(clips: RadioClip[], scopeIds?: string[]): RadioClip[] {
  const pool =
    scopeIds && scopeIds.length > 0
      ? clips.filter((clip) => scopeIds.includes(clip.id))
      : clips;
  return buildRadioProgramming(pool);
}

export function getNextPlayableClip(
  clips: RadioClip[],
  currentId: string,
  scopeIds?: string[],
): RadioClip | null {
  const programming = programmingPool(clips, scopeIds);
  if (programming.length === 0) return null;

  const currentIndex = programming.findIndex((clip) => clip.id === currentId);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % programming.length;
  return programming[nextIndex] ?? null;
}

export function getPreviousPlayableClip(
  clips: RadioClip[],
  currentId: string,
  scopeIds?: string[],
): RadioClip | null {
  const programming = programmingPool(clips, scopeIds);
  if (programming.length === 0) return null;

  const currentIndex = programming.findIndex((clip) => clip.id === currentId);
  const prevIndex = currentIndex < 0 ? 0 : (currentIndex - 1 + programming.length) % programming.length;
  return programming[prevIndex] ?? null;
}

/** Próximas faixas no flow editorial, começando pela que está no ar. */
export function getUpcomingClips(
  clips: RadioClip[],
  currentId: string,
  limit = 8,
  scopeIds?: string[],
): RadioClip[] {
  const programming = programmingPool(clips, scopeIds);
  if (programming.length === 0) return [];

  const currentIndex = programming.findIndex((clip) => clip.id === currentId);
  const start = currentIndex < 0 ? 0 : currentIndex;
  const count = Math.min(limit, programming.length);
  const upcoming: RadioClip[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const clip = programming[(start + offset) % programming.length];
    if (clip) upcoming.push(clip);
  }

  return upcoming;
}

export function getFirstClipForPlatform(clips: RadioClip[], platformId: PlatformId): RadioClip | undefined {
  const editorial = clips.find(
    (clip) => clip.platform === platformId && clip.id.startsWith("radio-"),
  );
  const platformClips = clips.filter((clip) => clip.platform === platformId);
  const sorted = [...platformClips].sort((a, b) => clipPlaybackRank(b) - clipPlaybackRank(a));
  return editorial ?? sorted[0];
}

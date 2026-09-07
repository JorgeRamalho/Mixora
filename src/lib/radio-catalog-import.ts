import type { PlatformId } from "../types/platform";
import type { RadioClip } from "../types/radio";
import {
  PLATFORM_IMPORT_QUERIES,
  platformSearchUrl,
  resolveYoutubeId,
} from "../data/radio-youtube-map";
import { BEGINNER_DJ_QUERIES } from "../data/beginner-dj-tracks";
import { fetchDeezerJson } from "./deezer-api";

const STORAGE_KEY = "mamute.radio.imports";

interface DeezerArtist {
  name: string;
}

interface DeezerAlbum {
  title: string;
}

interface DeezerTrack {
  id: number;
  title: string;
  title_short: string;
  link: string;
  duration: number;
  preview: string;
  artist: DeezerArtist;
  album: DeezerAlbum;
}

interface DeezerSearchResponse {
  data: DeezerTrack[];
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function guessGenre(platform: PlatformId): string {
  switch (platform) {
    case "beatport":
      return "Dance / Club";
    case "spotify":
      return "Editorial";
    case "deezer":
      return "Rádio editorial";
    case "youtube":
      return "Clipe oficial";
    case "soundcloud":
      return "Underground / Mix";
    case "mamute":
      return "Electronic";
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}

function mapDeezerTrack(
  track: DeezerTrack,
  platform: PlatformId,
  captionPrefix = "Importado",
): RadioClip {
  const artist = track.artist.name;
  const title = track.title_short || track.title;
  const youtubeId = resolveYoutubeId(artist, title);

  return {
    id: `import-${platform}-${track.id}`,
    title,
    artist,
    genre: guessGenre(platform),
    bpm: 126,
    key: "—",
    duration: formatDuration(track.duration),
    youtubeId: youtubeId ?? "",
    previewUrl: track.preview,
    sourceUrl: track.link || platformSearchUrl(platform, artist, title),
    caption: `${captionPrefix} · ${platform} · preview ou clipe no player.`,
    platform,
    importedAt: Date.now(),
  };
}

async function fetchDeezerSearch(query: string, limit = 1): Promise<DeezerTrack[]> {
  const payload = await fetchDeezerJson<DeezerSearchResponse>("search/track", {
    q: query,
    limit,
  });
  return payload?.data ?? [];
}

function dedupeClips(clips: RadioClip[]): RadioClip[] {
  const seen = new Set<string>();
  return clips.filter((clip) => {
    const key = `${clip.platform}:${clip.artist}:${clip.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function loadStoredImports(): RadioClip[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RadioClip[];
  } catch {
    return [];
  }
}

export function saveStoredImports(clips: RadioClip[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
}

export function mergeImports(existing: RadioClip[], incoming: RadioClip[]): RadioClip[] {
  const byId = new Map(existing.map((clip) => [clip.id, clip]));
  for (const clip of incoming) {
    byId.set(clip.id, clip);
  }
  return dedupeClips([...byId.values()]);
}

export async function importPlatformCatalog(
  platform: PlatformId,
  queries: string[] = PLATFORM_IMPORT_QUERIES[platform] ?? [],
  captionPrefix = "Importado",
): Promise<RadioClip[]> {
  if (!queries.length) return [];

  const imported: RadioClip[] = [];
  for (const query of queries) {
    const tracks = await fetchDeezerSearch(query, 1);
    const first = tracks[0];
    if (first) imported.push(mapDeezerTrack(first, platform, captionPrefix));
  }

  return dedupeClips(imported);
}

export async function importBeginnerDjCatalog(): Promise<RadioClip[]> {
  const platforms = (Object.keys(BEGINNER_DJ_QUERIES) as PlatformId[]).filter(
    (platform) => BEGINNER_DJ_QUERIES[platform]?.length,
  );
  const batches = await Promise.all(
    platforms.map((platform) =>
      importPlatformCatalog(platform, BEGINNER_DJ_QUERIES[platform] ?? [], "Essencial DJ iniciante"),
    ),
  );
  return dedupeClips(batches.flat());
}

export async function syncBeginnerDjToStorage(): Promise<RadioClip[]> {
  const stored = loadStoredImports();
  const incoming = await importBeginnerDjCatalog();
  const merged = mergeImports(stored, incoming);
  saveStoredImports(merged);
  return merged;
}

export async function importAllPlatformCatalogs(
  platforms: PlatformId[] = ["spotify", "soundcloud", "deezer", "youtube", "beatport"],
): Promise<RadioClip[]> {
  const batches = await Promise.all(platforms.map((platform) => importPlatformCatalog(platform)));
  return dedupeClips(batches.flat());
}

export async function syncCatalogToStorage(platform?: PlatformId): Promise<RadioClip[]> {
  const stored = loadStoredImports();
  const incoming = platform
    ? await importPlatformCatalog(platform)
    : await importAllPlatformCatalogs();
  const merged = mergeImports(stored, incoming);
  saveStoredImports(merged);
  return merged;
}

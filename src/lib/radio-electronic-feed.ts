import type { PlatformId } from "../types/platform";
import type { RadioClip } from "../types/radio";
import { RADIO_PLATFORM_ORDER } from "../data/radio";
import { fetchDeezerJson } from "./deezer-api";

interface DeezerArtist {
  name: string;
}

interface DeezerTrack {
  id: number;
  title: string;
  title_short?: string;
  preview: string;
  duration?: number;
  link?: string;
  artist?: DeezerArtist;
}

interface DeezerListResponse {
  data?: DeezerTrack[];
}

const ELECTRONIC_QUERIES: Array<{ q: string; genre: string; platform: PlatformId }> = [
  { q: "house", genre: "House", platform: "spotify" },
  { q: "techno", genre: "Techno", platform: "beatport" },
  { q: "trance", genre: "Trance", platform: "deezer" },
  { q: "progressive house", genre: "Progressive House", platform: "soundcloud" },
  { q: "melodic techno", genre: "Melodic Techno", platform: "beatport" },
  { q: "deep house", genre: "Deep House", platform: "spotify" },
  { q: "electro house", genre: "Electro House", platform: "deezer" },
  { q: "drum and bass", genre: "Drum & Bass", platform: "soundcloud" },
  { q: "afro house", genre: "Afro House", platform: "beatport" },
  { q: "festival edm", genre: "EDM", platform: "spotify" },
];

const CHART_PATHS = ["chart/132/tracks", "chart/0/tracks"];

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:30";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function liveStream(
  id: string,
  title: string,
  genre: string,
  platform: PlatformId,
  path: string,
): RadioClip {
  return {
    id,
    title,
    artist: "Mamute FM · eletrônico 24h",
    genre,
    bpm: 128,
    key: "—",
    duration: "LIVE",
    youtubeId: "",
    previewUrl: `https://ice4.somafm.com/${path}-128-mp3`,
    sourceUrl: `https://somafm.com/${path}/`,
    caption: "Stream MP3 eletrônico contínuo.",
    platform,
  };
}

/** Streams Icecast MP3 — tocam sem parar. O acervo das plataformas entra na fila depois. */
export const ELECTRONIC_LIVE_STREAMS: RadioClip[] = [
  liveStream("radio-stream-trip", "The Trip", "Progressive / Trance", "beatport", "thetrip"),
  liveStream("radio-stream-blender", "Beat Blender", "Deep House", "spotify", "beatblender"),
  liveStream("radio-stream-defcon", "DEF CON Radio", "Techno / Electro", "soundcloud", "defcon"),
  liveStream("radio-stream-dubstep", "Dub Step Beyond", "Bass / Dubstep", "youtube", "dubstep"),
  liveStream("radio-stream-cliqhop", "cliqhop idm", "IDM / Electronica", "deezer", "cliqhop"),
];

export const ELECTRONIC_LIVE_STREAM = ELECTRONIC_LIVE_STREAMS[0]!;

const LIVE_MIRRORS: Record<string, string[]> = {
  "thetrip": ["https://ice6.somafm.com/thetrip-128-mp3", "https://ice2.somafm.com/thetrip-128-mp3"],
  "beatblender": ["https://ice6.somafm.com/beatblender-128-mp3"],
  "defcon": ["https://ice6.somafm.com/defcon-128-mp3"],
  "dubstep": ["https://ice6.somafm.com/dubstep-128-mp3"],
  "cliqhop": ["https://ice6.somafm.com/cliqhop-128-mp3"],
};

export function liveStreamUrls(clip: RadioClip): string[] {
  const url = clip.previewUrl;
  if (!url) return [];
  const match = /somafm\.com\/([a-z0-9]+)-128-mp3/i.exec(url);
  const extras = match ? (LIVE_MIRRORS[match[1] ?? ""] ?? []) : [];
  return [url, ...extras];
}

export function isLiveElectronicStream(clip: RadioClip | null): boolean {
  return Boolean(clip && ELECTRONIC_LIVE_STREAMS.some((stream) => stream.id === clip.id));
}

function mapTrack(track: DeezerTrack, platform: PlatformId, genre: string): RadioClip | null {
  if (!track.preview) return null;
  const artist = track.artist?.name?.trim() || "Electronic";
  const title = (track.title_short || track.title || "Untitled").trim();
  return {
    id: `mp3-${platform}-${track.id}`,
    title,
    artist,
    genre,
    bpm: 126,
    key: "—",
    duration: formatDuration(track.duration ?? 30),
    youtubeId: "",
    previewUrl: track.preview,
    sourceUrl: track.link,
    caption: `Acervo eletrônico · ${platform} · stream MP3.`,
    platform,
  };
}

function rotatePlatform(index: number): PlatformId {
  const hubs = RADIO_PLATFORM_ORDER.filter((id) => id !== "mamute");
  return hubs[index % hubs.length] ?? "deezer";
}

function dedupeMp3(clips: RadioClip[]): RadioClip[] {
  const seen = new Set<string>();
  return clips.filter((clip) => {
    if (!clip.previewUrl) return false;
    const key = `${clip.artist}:${clip.title}`.toLowerCase();
    if (seen.has(key) || seen.has(clip.previewUrl)) return false;
    seen.add(key);
    seen.add(clip.previewUrl);
    return true;
  });
}

export async function fetchElectronicDeezerFeed(): Promise<RadioClip[]> {
  const collected: RadioClip[] = [];

  const charts = await Promise.all(
    CHART_PATHS.map((path) => fetchDeezerJson<DeezerListResponse>(path, { limit: 40 })),
  );
  charts.forEach((chart) => {
    (chart?.data ?? []).forEach((track, index) => {
      const mapped = mapTrack(track, rotatePlatform(index), "Dance / Electronic");
      if (mapped) collected.push(mapped);
    });
  });

  const searches = await Promise.all(
    ELECTRONIC_QUERIES.map((query) =>
      fetchDeezerJson<DeezerListResponse>("search/track", {
        q: query.q,
        limit: 12,
      }).then((payload) => ({ query, payload })),
    ),
  );
  for (const { query, payload } of searches) {
    for (const track of payload?.data ?? []) {
      const mapped = mapTrack(track, query.platform, query.genre);
      if (mapped) collected.push(mapped);
    }
  }

  return dedupeMp3(collected);
}

export function withLiveStreamFallback(clips: RadioClip[]): RadioClip[] {
  const liveIds = new Set(ELECTRONIC_LIVE_STREAMS.map((stream) => stream.id));
  const rest = clips.filter((clip) => Boolean(clip.previewUrl) && !liveIds.has(clip.id));
  return [...ELECTRONIC_LIVE_STREAMS, ...rest];
}

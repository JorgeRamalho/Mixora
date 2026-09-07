import type { PlatformId } from "../types/platform";

/** Consultas editoriais por plataforma — metadados via API pública Deezer. */
export const PLATFORM_IMPORT_QUERIES: Partial<Record<PlatformId, string[]>> = {
  spotify: [
    "avicii levels",
    "calvin harris summer",
    "disclosure latch",
    "dua lipa levitating",
    "fred again places",
  ],
  beatport: [
    "fisher losing it",
    "mochakk jealous type",
    "camelphat cola",
    "adam beyer your mind",
    "anyma running",
  ],
  deezer: [
    "deadmau5 strobe",
    "eric prydz call on me",
    "swedish house mafia heaven takes you home",
    "david guetta when love takes over",
    "paul kalkbrenner sky and sand",
  ],
  youtube: [
    "martin garrix animals",
    "tiesto the business",
    "armin van buuren this is what it feels like",
    "skrillex bangarang",
    "calvin harris feel so close",
  ],
  soundcloud: [
    "fred again places",
    "anyma running",
    "mochakk jealous type",
    "disclosure latch",
  ],
};

function normalizeKey(artist: string, title: string): string {
  return `${artist} ${title}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Clipes oficiais no YouTube para playback legal na Mamute FM. */
export const YOUTUBE_CLIP_MAP: Record<string, string> = {
  [normalizeKey("Avicii", "Levels")]: "_ovdm2yX4MA",
  [normalizeKey("Daft Punk", "Around the World")]: "K0HSD_i2DvA",
  [normalizeKey("Deadmau5", "Strobe")]: "tKi9Z-f6qX4",
  [normalizeKey("David Guetta", "Titanium")]: "JRfuAukYTKg",
  [normalizeKey("Swedish House Mafia", "Don't You Worry Child")]: "1y6smkh6c-0",
  [normalizeKey("Daft Punk", "One More Time")]: "FGBhQbmPwH8",
  [normalizeKey("Eric Prydz", "Opus")]: "h-nQ63LCV7I",
  [normalizeKey("Avicii", "Wake Me Up")]: "IcrbM1l_BoI",
  [normalizeKey("FISHER", "Losing It")]: "bkWeCDNDSjU",
  [normalizeKey("Fisher", "Losing It")]: "bkWeCDNDSjU",
  [normalizeKey("CamelPhat", "Cola")]: "q3lX2Jl_W-Q",
  [normalizeKey("CamelPhat & Elderbrook", "Cola")]: "q3lX2Jl_W-Q",
  [normalizeKey("Calvin Harris", "Summer")]: "EBbfGFkj5lY",
  [normalizeKey("Disclosure", "Latch")]: "bSfpSOBM30U",
  [normalizeKey("Disclosure ft. Sam Smith", "Latch")]: "bSfpSOBM30U",
  [normalizeKey("Martin Garrix", "Animals")]: "gCYcHz2k5x0",
  [normalizeKey("Tiësto", "The Business")]: "nrTk0s0ioqs",
  [normalizeKey("Tiesto", "The Business")]: "nrTk0s0ioqs",
  [normalizeKey("Armin van Buuren", "This Is What It Feels Like")]: "BIEyXB30rBQ",
  [normalizeKey("Skrillex", "Bangarang")]: "YJVmu6eefDI",
  [normalizeKey("Calvin Harris", "Feel So Close")]: "dGghkjpNCQ8",
  [normalizeKey("Fred again..", "places")]: "4KBrBLoBIIY",
  [normalizeKey("Fred again", "places")]: "4KBrBLoBIIY",
  [normalizeKey("Dua Lipa", "Levitating")]: "TUVcZ9Q0TIE",
  [normalizeKey("David Guetta", "When Love Takes Over")]: "p3JLaF0fklc",
  [normalizeKey("Paul Kalkbrenner", "Sky and Sand")]: "YqJ9U2Z_hgE",
  [normalizeKey("Swedish House Mafia", "Heaven Takes You Home")]: "Y9GCM9DZxX0",
  [normalizeKey("Eric Prydz", "Call On Me")]: "LQvLAWK2Xzk",
  [normalizeKey("Anyma", "Running")]: "h8T8M8b5hQY",
  [normalizeKey("Mochakk", "Jealous Type")]: "Y3O8qKXpMhY",
};

export function resolveYoutubeId(artist: string, title: string): string | undefined {
  const shortTitle = title.replace(/\s*\([^)]*\)\s*/g, "").trim();
  return (
    YOUTUBE_CLIP_MAP[normalizeKey(artist, title)] ??
    YOUTUBE_CLIP_MAP[normalizeKey(artist, shortTitle)]
  );
}

export function platformSearchUrl(platform: PlatformId, artist: string, title: string): string {
  const q = encodeURIComponent(`${artist} ${title}`);
  switch (platform) {
    case "spotify":
      return `https://open.spotify.com/search/${q}`;
    case "beatport":
      return `https://www.beatport.com/search?q=${q}`;
    case "deezer":
      return `https://www.deezer.com/search/${q}`;
    case "youtube":
      return `https://music.youtube.com/search?q=${q}`;
    case "soundcloud":
      return `https://soundcloud.com/search?q=${q}`;
    case "mamute":
      return "/radio";
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}

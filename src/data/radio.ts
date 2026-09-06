import type { PlatformId } from "../types/platform";
import type { RadioClip, RadioEqBand } from "../types/radio";
import { RADIO_IMPORTED_SEEDS } from "./radio-imports";
import { mergeImports, loadStoredImports } from "../lib/radio-catalog-import";
import { platformSearchUrl } from "./radio-youtube-map";

export const RADIO_PLATFORM_ORDER: PlatformId[] = [
  "spotify",
  "soundcloud",
  "youtube",
  "beatport",
  "deezer",
];

/** Tipo de programação Mamute FM em cada hub (rótulo no visor flutuante). */
export const RADIO_PLATFORM_STATION_TYPES: Record<PlatformId, string> = {
  mamute: "Cabine Mamute",
  spotify: "Playlists editoriais",
  soundcloud: "Sets e uploads",
  youtube: "Clipes oficiais",
  beatport: "Charts DJ",
  deezer: "Rádio editorial",
};

export const RADIO_IMPORT_PLATFORMS: PlatformId[] = [
  "spotify",
  "soundcloud",
  "youtube",
  "beatport",
  "deezer",
];

export const RADIO_EQ_BANDS: RadioEqBand[] = [
  { id: "sub", label: "SUB", hz: "60 Hz" },
  { id: "low", label: "LOW", hz: "250 Hz" },
  { id: "mid", label: "MID", hz: "1 kHz" },
  { id: "high", label: "HI", hz: "4 kHz" },
  { id: "air", label: "AIR", hz: "12 kHz" },
];

export const RADIO_CLIPS: RadioClip[] = [
  {
    id: "radio-spotify-01",
    title: "Levels",
    artist: "Avicii",
    genre: "Progressive",
    bpm: 126,
    key: "4B",
    duration: "3:19",
    youtubeId: "_ovdm2yX4MA",
    sourceUrl: "https://open.spotify.com/search/avicii%20levels",
    caption: "Descoberta editorial · energia de festival no visor Mamute.",
    platform: "spotify",
  },
  {
    id: "radio-spotify-02",
    title: "One More Time",
    artist: "Daft Punk",
    genre: "French House",
    bpm: 123,
    key: "5A",
    duration: "5:20",
    youtubeId: "FGBhQbmPwH8",
    sourceUrl: "https://open.spotify.com/search/daft%20punk%20one%20more%20time",
    caption: "Playlist Mamute · groove clássico no hub Spotify.",
    platform: "spotify",
  },
  {
    id: "radio-spotify-03",
    title: "Pjanoo",
    artist: "Eric Prydz",
    genre: "Progressive House",
    bpm: 128,
    key: "1B",
    duration: "2:42",
    youtubeId: "qZxXWcj8sXA",
    sourceUrl: "https://open.spotify.com/search/eric%20prydz%20pjanoo",
    caption: "Playlist Mamute · Si maior (1B) para filtrar na roda Camelot.",
    platform: "spotify",
  },
  {
    id: "radio-deezer-01",
    title: "Titanium",
    artist: "David Guetta ft. Sia",
    genre: "Electro House",
    bpm: 126,
    key: "9B",
    duration: "4:05",
    youtubeId: "JRfuAukYTKg",
    sourceUrl: "https://www.deezer.com/search/david%20guetta%20titanium",
    caption: "Rádio editorial · vocal no breakdown · drop seco.",
    platform: "deezer",
  },
  {
    id: "radio-deezer-02",
    title: "Wake Me Up",
    artist: "Avicii",
    genre: "Folk House",
    bpm: 124,
    key: "3B",
    duration: "4:07",
    youtubeId: "IcrbM1l_BoI",
    sourceUrl: "https://www.deezer.com/search/avicii%20wake%20me%20up",
    caption: "Mix editorial Deezer · crossover no dial Mamute.",
    platform: "deezer",
  },
  {
    id: "radio-youtube-01",
    title: "Don't You Worry Child",
    artist: "Swedish House Mafia",
    genre: "Progressive House",
    bpm: 129,
    key: "11B",
    duration: "3:32",
    youtubeId: "1y6smkh6c-0",
    sourceUrl: "https://music.youtube.com/search?q=swedish+house+mafia+don%27t+you+worry+child",
    caption: "Clipe oficial · YouTube Music no widescreen da cabine.",
    platform: "youtube",
  },
  {
    id: "radio-soundcloud-01",
    title: "places",
    artist: "Fred again..",
    genre: "UK Garage",
    bpm: 130,
    key: "8A",
    duration: "3:24",
    youtubeId: "4KBrBLoBIIY",
    sourceUrl: "https://soundcloud.com/search?q=fred%20again%20places",
    caption: "Cena SoundCloud · UKG vocal · referência de groove contemporâneo.",
    platform: "soundcloud",
  },
  {
    id: "radio-soundcloud-02",
    title: "Running",
    artist: "Anyma",
    genre: "Melodic Techno",
    bpm: 126,
    key: "7A",
    duration: "4:12",
    youtubeId: "h8T8M8b5hQY",
    sourceUrl: "https://soundcloud.com/search?q=anyma%20running",
    caption: "Upload / cena SoundCloud · arco Afterlife no dial Mamute.",
    platform: "soundcloud",
  },
  {
    id: "radio-beatport-01",
    title: "Around the World",
    artist: "Daft Punk",
    genre: "French House",
    bpm: 121,
    key: "8A",
    duration: "4:01",
    youtubeId: "K0HSD_i2DvA",
    sourceUrl: "https://www.beatport.com/search?q=daft%20punk%20around%20the%20world",
    caption: "Chart dance · filtro em movimento · referência de phrasing.",
    platform: "beatport",
  },
  {
    id: "radio-beatport-02",
    title: "Opus",
    artist: "Eric Prydz",
    genre: "Progressive House",
    bpm: 128,
    key: "6A",
    duration: "9:03",
    youtubeId: "h-nQ63LCV7I",
    sourceUrl: "https://www.beatport.com/search?q=eric%20prydz%20opus",
    caption: "Release longo · build cinematográfico da fila Beatport.",
    platform: "beatport",
  },
];

export function buildRadioCatalog(storedImports: RadioClip[] = loadStoredImports()): RadioClip[] {
  return mergeImports(mergeImports(RADIO_CLIPS, RADIO_IMPORTED_SEEDS), storedImports);
}

export { platformSearchUrl };

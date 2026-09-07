import type { PlatformId } from "../types/platform";

/** Faixas essenciais para DJ iniciante — fáceis de mixar, BPM estável e reconhecíveis. */
export const BEGINNER_DJ_QUERIES: Partial<Record<PlatformId, string[]>> = {
  spotify: [
    "avicii levels",
    "daft punk one more time",
    "calvin harris summer",
    "disclosure latch",
    "avicii wake me up",
    "dua lipa levitating",
  ],
  deezer: [
    "david guetta titanium",
    "swedish house mafia don't you worry child",
    "eric prydz call on me",
    "paul kalkbrenner sky and sand",
    "deadmau5 strobe",
    "david guetta when love takes over",
  ],
  youtube: [
    "martin garrix animals",
    "tiesto the business",
    "calvin harris feel so close",
    "armin van buuren this is what it feels like",
    "swedish house mafia heaven takes you home",
    "skrillex bangarang",
  ],
  beatport: [
    "fisher losing it",
    "camelphat cola",
    "daft punk around the world",
    "eric prydz opus",
    "mochakk jealous type",
    "adam beyer your mind",
  ],
};

export const BEGINNER_DJ_HINT =
  "Playlist curada com clássicos de festival, house e progressive — ideais para treinar transição, EQ e phrasing no Mamute FM.";

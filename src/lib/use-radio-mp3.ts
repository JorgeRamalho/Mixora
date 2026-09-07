import { useEffect, useState } from "react";
import { buildRadioCatalog } from "../data/radio";
import type { RadioClip } from "../types/radio";
import { enrichCatalogWithPreviews } from "./radio-catalog-enrich";
import { fetchElectronicDeezerFeed, withLiveStreamFallback } from "./radio-electronic-feed";
import { radioMp3Station, type RadioMp3Snapshot } from "./radio-mp3-station";
import { syncBeginnerDjToStorage } from "./radio-catalog-import";
import { markBeginnerPlaylistLoaded, wasBeginnerPlaylistLoaded } from "./radio-user-playlist";
import { buildRadioProgramming } from "./radio-playlist";

function mergeMp3Catalog(base: RadioClip[], feed: RadioClip[]): RadioClip[] {
  const byId = new Map<string, RadioClip>();
  for (const clip of [...base, ...feed]) {
    if (!clip.previewUrl) continue;
    byId.set(clip.id, clip);
  }
  return withLiveStreamFallback(buildRadioProgramming([...byId.values()]));
}

let catalogPromise: Promise<RadioClip[]> | null = null;

export async function loadRadioMp3Catalog(): Promise<RadioClip[]> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      if (!wasBeginnerPlaylistLoaded()) {
        try {
          await syncBeginnerDjToStorage();
          markBeginnerPlaylistLoaded();
        } catch {
          /* acervo Deezer ainda cobre o flow */
        }
      }
      const [editorial, feed] = await Promise.all([
        enrichCatalogWithPreviews(buildRadioCatalog()),
        fetchElectronicDeezerFeed(),
      ]);
      return mergeMp3Catalog(editorial, feed);
    })();
  }
  return catalogPromise;
}

export function reloadRadioMp3Catalog(): Promise<RadioClip[]> {
  catalogPromise = null;
  return loadRadioMp3Catalog();
}

export function useRadioMp3(): RadioMp3Snapshot & {
  start: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  skip: (delta: 1 | -1) => Promise<void>;
  playClip: (clipId: string) => Promise<void>;
} {
  const [snap, setSnap] = useState<RadioMp3Snapshot>(() => radioMp3Station.snapshot());

  useEffect(() => radioMp3Station.subscribe(setSnap), []);

  useEffect(() => {
    void loadRadioMp3Catalog().then((clips) => {
      radioMp3Station.ensurePlaylist(clips);
      void radioMp3Station.boot();
    });
  }, []);

  return {
    ...snap,
    start: () => radioMp3Station.start(),
    pause: () => radioMp3Station.pause(),
    toggle: () => radioMp3Station.toggle(),
    skip: (delta) => radioMp3Station.advance(delta, true),
    playClip: (clipId) => radioMp3Station.playClip(clipId),
  };
}

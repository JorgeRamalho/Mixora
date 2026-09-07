import { useCallback, useEffect, useState } from "react";
import { PLATFORMS } from "../../data/platforms";
import { buildRadioCatalog } from "../../data/radio";
import { withLiveStreamFallback } from "../../lib/radio-electronic-feed";
import { radioEngine } from "../../lib/radio-engine";
import { radioMp3Station } from "../../lib/radio-mp3-station";
import { buildRadioProgramming } from "../../lib/radio-playlist";
import { loadRadioMp3Catalog, reloadRadioMp3Catalog } from "../../lib/use-radio-mp3";
import {
  loadUserPlaylistIds,
  togglePlaylistClip,
} from "../../lib/radio-user-playlist";
import type { RadioClip, RadioEqLevels, RadioSource, RadioUpload } from "../../types/radio";
import { RadioDjPlayer } from "./RadioDjPlayer";
import { RadioLoopDeck } from "./RadioLoopDeck";

const platformById = new Map(PLATFORMS.map((platform) => [platform.id, platform]));

const DEFAULT_EQ: RadioEqLevels = {
  sub: 0.52,
  low: 0.5,
  mid: 0.48,
  high: 0.54,
  air: 0.5,
};

function syncClipInCatalog(catalog: RadioClip[], clipId: string): RadioClip | undefined {
  return catalog.find((clip) => clip.id === clipId);
}

export function RadioStudio() {
  const [catalog, setCatalog] = useState<RadioClip[]>(() => buildRadioCatalog());
  const [catalogReady, setCatalogReady] = useState(false);
  const [playlistIds, setPlaylistIds] = useState<string[]>(() => loadUserPlaylistIds());
  const [playlistOnly, setPlaylistOnly] = useState(false);
  const [source, setSource] = useState<RadioSource>(() => ({
    kind: "clip",
    clip: buildRadioCatalog()[0]!,
    continuous: true,
    autoplay: false,
  }));

  const applyCatalog = useCallback((next: RadioClip[]) => {
    setCatalog(next);
    setSource((current) => {
      if (current.kind !== "clip") return current;
      const updated = syncClipInCatalog(next, current.clip.id);
      return updated ? { ...current, clip: updated } : current;
    });
  }, []);

  const refreshCatalog = useCallback(() => {
    void reloadRadioMp3Catalog().then((clips) => {
      applyCatalog(clips);
      radioMp3Station.setPlaylist(clips);
      setCatalogReady(true);
    });
  }, [applyCatalog]);

  useEffect(() => {
    let cancelled = false;
    void loadRadioMp3Catalog().then((clips) => {
      if (cancelled) return;
      applyCatalog(clips);
      radioMp3Station.setPlaylist(clips);
      setCatalogReady(true);
      setSource((current) =>
        current.kind === "clip"
          ? { ...current, clip: clips[0] ?? current.clip, autoplay: false, continuous: true }
          : current,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [applyCatalog]);

  const visibleClips = playlistOnly ? catalog.filter((clip) => playlistIds.includes(clip.id)) : catalog;

  useEffect(() => {
    if (!catalogReady) return;
    const next = playlistOnly
      ? catalog.filter((clip) => playlistIds.includes(clip.id))
      : catalog;
    const pool = next.length > 0 ? next : catalog;
    const programmed = buildRadioProgramming(pool);
    radioMp3Station.setPlaylist(withLiveStreamFallback(programmed.length > 0 ? programmed : pool));
  }, [catalog, catalogReady, playlistIds, playlistOnly]);

  const accent =
    source.kind === "clip"
      ? (platformById.get(source.clip.platform)?.accent ?? "#00e8ff")
      : "#00e8ff";

  const selectClip = (clip: RadioClip, options?: { autoplay?: boolean }) => {
    radioEngine.stop();
    setSource((current) => ({
      kind: "clip",
      clip,
      continuous: current.kind === "clip" ? current.continuous : true,
      autoplay: options?.autoplay ?? false,
    }));
    if (options?.autoplay) void radioMp3Station.playClip(clip.id);
  };

  const selectUpload = (upload: RadioUpload) => {
    radioMp3Station.pause();
    setSource({ kind: "upload", upload });
  };

  const toggleContinuous = () => {
    if (source.kind !== "clip") return;
    setSource({ ...source, continuous: !source.continuous });
  };

  const handleTogglePlaylistClip = useCallback((clipId: string) => {
    setPlaylistIds(togglePlaylistClip(clipId));
  }, []);

  useEffect(() => {
    radioEngine.setEqAll(DEFAULT_EQ);
  }, []);

  useEffect(() => {
    if (source.kind !== "clip") return;
    return radioMp3Station.subscribe((snap) => {
      const nextClip = snap.clip;
      if (!nextClip) return;
      setSource((current) => {
        if (current.kind !== "clip") return current;
        if (current.clip.id === nextClip.id) return current;
        return { ...current, clip: nextClip };
      });
    });
  }, [source.kind]);

  return (
    <div className="radio-studio">
      <RadioDjPlayer
        clips={visibleClips}
        catalogReady={catalogReady}
        accent={accent}
        playlistIds={playlistIds}
        playlistOnly={playlistOnly}
        onPlaylistOnlyChange={setPlaylistOnly}
        onCatalogUpdated={refreshCatalog}
        source={source}
        onTogglePlaylistClip={handleTogglePlaylistClip}
        onSelectClip={selectClip}
        onToggleContinuous={toggleContinuous}
      />
      <RadioLoopDeck
        activeUploadId={source.kind === "upload" ? source.upload.id : null}
        onSelectUpload={selectUpload}
      />
    </div>
  );
}

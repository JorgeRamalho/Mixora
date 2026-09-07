import { useCallback, useEffect, useRef, useState } from "react";
import { PLATFORMS } from "../data/platforms";
import { buildRadioCatalog } from "../data/radio";
import type { RadioClip, RadioSource } from "../types/radio";
import { enrichCatalogWithPreviews } from "./radio-catalog-enrich";
import { getNextPlayableClip, getPreviousPlayableClip, isPlayableClip } from "./radio-playlist";

const platformById = new Map(PLATFORMS.map((platform) => [platform.id, platform]));

function firstPlayable(clips: RadioClip[]): RadioClip | undefined {
  return clips.find(isPlayableClip) ?? clips[0];
}

export function useRadioFmStation() {
  const [catalog, setCatalog] = useState<RadioClip[]>(() => buildRadioCatalog());
  const [source, setSource] = useState<RadioSource>(() => ({
    kind: "clip",
    clip: firstPlayable(buildRadioCatalog())!,
    continuous: true,
    autoplay: false,
  }));
  const [catalogReady, setCatalogReady] = useState(false);
  const lastAdvanceAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void enrichCatalogWithPreviews(buildRadioCatalog()).then((enriched) => {
      if (cancelled) return;
      setCatalog(enriched);
      setCatalogReady(true);
      setSource((current) => {
        if (current.kind !== "clip") return current;
        const updated = enriched.find((clip) => clip.id === current.clip.id);
        const fallback = firstPlayable(enriched);
        const clip = updated ?? fallback;
        return clip ? { ...current, clip } : current;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const clip = source.kind === "clip" ? source.clip : null;
  const continuous = source.kind === "clip" && source.continuous;
  const autoplay = source.kind === "clip" && source.autoplay;
  const accent = clip ? (platformById.get(clip.platform)?.accent ?? "#00e8ff") : "#00e8ff";

  const skip = useCallback(
    (delta: 1 | -1): RadioClip | null => {
      if (source.kind !== "clip") return null;
      const next =
        delta === 1
          ? getNextPlayableClip(catalog, source.clip.id)
          : getPreviousPlayableClip(catalog, source.clip.id);
      if (!next) return null;
      setSource({ kind: "clip", clip: next, continuous: true, autoplay: true });
      return next;
    },
    [catalog, source],
  );

  const handleTrackEnded = useCallback(() => {
    const now = Date.now();
    if (now - lastAdvanceAtRef.current < 800) return;
    lastAdvanceAtRef.current = now;
    setSource((current) => {
      if (current.kind !== "clip") return current;
      const next = getNextPlayableClip(catalog, current.clip.id);
      if (!next || next.id === current.clip.id) return current;
      return { kind: "clip", clip: next, continuous: true, autoplay: true };
    });
  }, [catalog]);

  const consumeAutoplay = useCallback(() => {
    setSource((current) =>
      current.kind === "clip" && current.autoplay ? { ...current, autoplay: false } : current,
    );
  }, []);

  const start = useCallback(() => {
    setSource((current) =>
      current.kind === "clip" ? { ...current, autoplay: true, continuous: true } : current,
    );
  }, []);

  return {
    catalog,
    catalogReady,
    clip,
    continuous,
    autoplay,
    accent,
    skip,
    handleTrackEnded,
    consumeAutoplay,
    start,
  };
}

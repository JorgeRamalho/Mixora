import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { DeckId, TrainingTrack } from "../types/mixer";

/** Distância mínima para o clique virar arraste até o deck. */
export const MIXER_TRACK_DRAG_THRESHOLD_PX = 8;

export type MixerTrackDrag = {
  trackId: string;
  title: string;
  x: number;
  y: number;
  over: DeckId | null;
  active: boolean;
};

export type MixerTrackDragHandlers = {
  onSelect: (trackId: string) => void;
  onDrop: (deckId: DeckId, trackId: string) => void;
};

/**
 * Aceita só os ids de deck da cabine. Qualquer outra string cai em `null`,
 * inclusive o que o DOM devolve quando o cursor ainda está na playlist.
 */
export function parseDeckDropId(value: string | null | undefined): DeckId | null {
  return value === "a" || value === "b" ? value : null;
}

/**
 * Sobe até o `.cdj-deck` mais próximo. O ghost de arraste tem
 * `pointer-events: none`, então `elementFromPoint` acerta o deck debaixo.
 */
export function deckIdFromElement(node: EventTarget | null): DeckId | null {
  if (!(node instanceof Element)) return null;
  return parseDeckDropId(node.closest(".cdj-deck")?.getAttribute("data-deck"));
}

export function deckIdFromPoint(x: number, y: number): DeckId | null {
  return deckIdFromElement(document.elementFromPoint(x, y));
}

/**
 * Arraste com o ponteiro do mouse. Os listeners ficam na `window` para o
 * `pointerup` contar mesmo quando o cursor já está em cima do deck.
 */
export function useMixerTrackDrag(handlers: MixerTrackDragHandlers) {
  const originRef = useRef<{
    x: number;
    y: number;
    trackId: string;
    title: string;
  } | null>(null);
  const handlersRef = useRef(handlers);
  const [drag, setDrag] = useState<MixerTrackDrag | null>(null);

  handlersRef.current = handlers;

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const origin = originRef.current;
      if (!origin) return;
      const active =
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >= MIXER_TRACK_DRAG_THRESHOLD_PX;
      setDrag({
        trackId: origin.trackId,
        title: origin.title,
        x: event.clientX,
        y: event.clientY,
        over: active ? deckIdFromPoint(event.clientX, event.clientY) : null,
        active,
      });
    };

    const settle = (event: PointerEvent) => {
      const origin = originRef.current;
      originRef.current = null;
      setDrag(null);
      if (!origin) return;
      const moved =
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >= MIXER_TRACK_DRAG_THRESHOLD_PX;
      const over = moved ? deckIdFromPoint(event.clientX, event.clientY) : null;
      if (moved && over) {
        handlersRef.current.onDrop(over, origin.trackId);
        return;
      }
      if (!moved) handlersRef.current.onSelect(origin.trackId);
    };

    const onUp = (event: PointerEvent) => settle(event);
    const onCancel = (event: PointerEvent) => {
      originRef.current = null;
      setDrag(null);
      if (event.type === "pointercancel") return;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, []);

  const onTrackPointerDown = useCallback((track: TrainingTrack, event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    originRef.current = {
      x: event.clientX,
      y: event.clientY,
      trackId: track.id,
      title: track.title,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* captura é extra; o gesto segue nos listeners da window */
    }
    setDrag({
      trackId: track.id,
      title: track.title,
      x: event.clientX,
      y: event.clientY,
      over: null,
      active: false,
    });
  }, []);

  return { drag, onTrackPointerDown };
}

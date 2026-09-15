import { useEffect, useLayoutEffect, type RefObject } from "react";
import { bindDeckTransportPlayback, subscribeDeckTransportFrame } from "./deck-transport-scheduler";
import { engine } from "./audio-engine";
import { formatDeckClock } from "./deck-clock";
import type { DeckId } from "../types/mixer";

/**
 * Atualiza relógio e data-phase do deck direto no DOM, sem re-render React.
 *
 * @param id Deck espelhado.
 * @param sectionRef Section `.cdj-deck` que recebe `data-phase`.
 * @param elapsedRef Span do tempo decorrido.
 * @param remainRef Span do tempo restante.
 */
export function paintDeckTransport(
  id: DeckId,
  sectionRef: RefObject<HTMLElement | null>,
  elapsedRef: RefObject<HTMLElement | null>,
  remainRef: RefObject<HTMLElement | null>,
): void {
  const deck = engine.snapshot[id];
  const phase = engine.livePhase(id);
  const positionSec = engine.livePositionSec(id);
  const section = sectionRef.current;
  if (section) {
    section.setAttribute("data-phase", phase.toFixed(3));
  }
  const elapsed = elapsedRef.current;
  if (elapsed) {
    elapsed.textContent = formatDeckClock(positionSec);
  }
  const remain = remainRef.current;
  if (remain) {
    const remainingSec = Math.max(0, (deck.durationSec || 0) - positionSec);
    remain.textContent = formatDeckClock(remainingSec, true);
  }
}

/**
 * Espelha transporte do engine no DOM do CDJ: fase, decorrido e restante.
 *
 * Durante playback usa RAF compartilhado; em pausa repinta no render após ações que disparam refresh.
 *
 * @param id Deck espelhado.
 * @param sectionRef Section `.cdj-deck` que recebe `data-phase`.
 * @param elapsedRef Span do tempo decorrido.
 * @param remainRef Span do tempo restante.
 */
export function useDeckTransportMirror(
  id: DeckId,
  sectionRef: RefObject<HTMLElement | null>,
  elapsedRef: RefObject<HTMLElement | null>,
  remainRef: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    paintDeckTransport(id, sectionRef, elapsedRef, remainRef);
  });

  useEffect(() => {
    const paint = () => {
      paintDeckTransport(id, sectionRef, elapsedRef, remainRef);
    };

    const unsubscribeFrame = subscribeDeckTransportFrame(paint);
    const unsubscribePlaying = bindDeckTransportPlayback(paint);

    paint();

    return () => {
      unsubscribeFrame();
      unsubscribePlaying();
    };
  }, [id, sectionRef, elapsedRef, remainRef]);
}

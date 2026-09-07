import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import type { DeckId } from "../../../types/mixer";
import { loadRemoteTrackOnDeck } from "../../deck-remote-load";
import type { MixerEngine } from "../../mixer-dispatch";
import { getTracksApi } from "../index";
import { trackDetailKey } from "../query-keys";
import type { RemoteLoadStatus } from "../types";

export interface DeckRemoteLoadState {
  status: RemoteLoadStatus;
  message?: string;
  trackId?: string;
}

const IDLE: DeckRemoteLoadState = { status: "idle" };

/**
 * Orquestra o LOAD remoto por deck, com abort ao trocar de faixa e cache de detalhe.
 *
 * Não usa um único `useMutation`, porque os dois decks podem preparar áudio ao
 * mesmo tempo e a mutation global serializaria o segundo LOAD.
 *
 * @param eng Engine da cabine, já com `ensure` e `loadDeckBuffer`.
 */
export function useDeckRemoteLoad(eng: MixerEngine) {
  const queryClient = useQueryClient();
  const [byDeck, setByDeck] = useState<Record<DeckId, DeckRemoteLoadState>>({
    a: IDLE,
    b: IDLE,
  });
  const abortRef = useRef<Record<DeckId, AbortController | null>>({ a: null, b: null });

  const load = useCallback(
    async (deckId: DeckId, trackId: string) => {
      abortRef.current[deckId]?.abort();
      const controller = new AbortController();
      abortRef.current[deckId] = controller;

      setByDeck((prev) => ({
        ...prev,
        [deckId]: { status: "checking", trackId },
      }));

      try {
        const api = getTracksApi();
        const track = await queryClient.fetchQuery({
          queryKey: trackDetailKey(trackId),
          queryFn: () => api.getTrack(trackId),
          staleTime: 60_000,
        });
        await eng.ensure();
        const ctx = eng.audioContext();
        if (!ctx) {
          throw new Error("AudioContext indisponível");
        }
        await loadRemoteTrackOnDeck({
          ctx,
          api,
          track,
          signal: controller.signal,
          onStatus: (status) => {
            setByDeck((prev) => ({
              ...prev,
              [deckId]: { status, trackId },
            }));
          },
          loadBuffer: (buffer, meta) => eng.loadDeckBuffer(deckId, buffer, meta),
        });
        setByDeck((prev) => ({ ...prev, [deckId]: { status: "idle", trackId } }));
        return true;
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return false;
        const message = error instanceof Error ? error.message : "Falha ao carregar a faixa remota";
        setByDeck((prev) => ({
          ...prev,
          [deckId]: { status: "error", trackId, message },
        }));
        return false;
      }
    },
    [eng, queryClient],
  );

  const retry = useCallback(
    async (deckId: DeckId) => {
      const trackId = byDeck[deckId]?.trackId;
      if (!trackId) return false;
      return load(deckId, trackId);
    },
    [byDeck, load],
  );

  return { byDeck, load, retry };
}

/**
 * @param error Exceção do fetch ou do abort.
 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

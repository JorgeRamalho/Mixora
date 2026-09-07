import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { wrapCursor } from "../../mixer-browse";
import { getTracksApi } from "../index";
import { trackAnalysisKey, trackDetailKey } from "../query-keys";
import type { LibraryTrack } from "../types";

/**
 * Prefetch do detalhe e da análise V8 no cursor e nos vizinhos ±2.
 *
 * @param tracks Faixas remotas com beatport_id.
 * @param cursor Índice atual do encoder.
 */
export function usePrefetchAdjacentTracks(tracks: readonly LibraryTrack[], cursor: number): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (tracks.length === 0) return;
    const api = getTracksApi();
    for (const delta of [-2, -1, 0, 1, 2]) {
      const track = tracks[wrapCursor(cursor + delta, tracks.length)];
      if (!track) continue;
      void queryClient.prefetchQuery({
        queryKey: trackDetailKey(track.track_id),
        queryFn: () => api.getTrack(track.track_id),
        staleTime: 60_000,
      });
      if (track.beatport_id !== null) {
        void queryClient.prefetchQuery({
          queryKey: trackAnalysisKey(track.beatport_id),
          queryFn: () => api.fetchAnalysis(track.beatport_id!),
          staleTime: 300_000,
        });
      }
    }
  }, [tracks, cursor, queryClient]);
}

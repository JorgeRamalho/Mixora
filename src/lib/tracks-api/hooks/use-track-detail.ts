import { useQuery } from "@tanstack/react-query";
import { getTracksApi } from "../index";
import { trackDetailKey } from "../query-keys";

/**
 * Detalhe de uma faixa. `enabled` evita fetch com id vazio.
 *
 * @param trackId Id canônico, ou null se o cursor ainda não resolveu.
 */
export function useTrackDetail(trackId: string | null) {
  return useQuery({
    queryKey: trackDetailKey(trackId ?? ""),
    queryFn: () => getTracksApi().getTrack(trackId!),
    enabled: Boolean(trackId),
    staleTime: 60_000,
    networkMode: "always",
  });
}

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { BrowseSource } from "../../../types/mixer";
import { normalizeCamelotCode } from "../../musical-key";
import { LIBRARY_LIST_DEFAULT_LIMIT, type CamelotFilterMode } from "../types";
import { getTracksApi } from "../index";
import { trackListKey } from "../query-keys";

export interface TrackLibraryFilters {
  /** Busca livre `q`. */
  q?: string;
  /** Código Camelot escolhido na roda da cabine. */
  camelot?: string | null;
  /** Modo do filtro na API. Default `exact`. */
  camelotMode?: CamelotFilterMode;
}

/**
 * Lista a biblioteca remota. Só dispara quando o browse está em remote.
 *
 * `placeholderData: keepPreviousData` mantém a tabela anterior enquanto a
 * Query busca de novo, e por isso o encoder não pisca lista vazia.
 *
 * @param source Fonte ativa do browse.
 * @param filters Busca e filtro Camelot repassados ao GET /api/tracks.
 */
export function useTrackLibrary(source: BrowseSource, filters: TrackLibraryFilters = {}) {
  const query = filters.q?.trim() ?? "";
  const camelot = filters.camelot ? normalizeCamelotCode(filters.camelot) : null;
  const camelotMode = filters.camelotMode ?? "exact";

  return useQuery({
    queryKey: trackListKey(source, {
      q: query,
      sort: "title",
      camelot,
      camelotMode,
    }),
    queryFn: () =>
      getTracksApi().listTracks({
        limit: LIBRARY_LIST_DEFAULT_LIMIT,
        offset: 0,
        q: query || undefined,
        sort: "title",
        camelot: camelot ?? undefined,
        camelot_mode: camelot ? camelotMode : undefined,
      }),
    enabled: source === "remote",
    staleTime: 60_000,
    retry: 1,
    placeholderData: keepPreviousData,
    networkMode: "always",
  });
}

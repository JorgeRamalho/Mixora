import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import type { BrowseSource, RemoteCollectionMode } from "../../../types/mixer";

import { normalizeCamelotCode } from "../../musical-key";

import { LIBRARY_LIST_DEFAULT_LIMIT, type CamelotFilterMode } from "../types";

import { getTracksApi } from "../index";

import { trackListKey } from "../query-keys";

export interface TrackLibraryFilters {
  /** Biblioteca local ou catálogo Beatport. */
  collectionMode?: RemoteCollectionMode | null;
  /** Nome do artista enviado em `artist=`. */
  artist?: string | null;
  /** Nome da faixa enviado em `track=`. */
  track?: string | null;
  /** Álbum, EP ou mix enviado em `release=`. */
  release?: string | null;
  /** Selo enviado em `label=`. */
  label?: string | null;
  /** Id Beatport do gênero pai, quando a taxonomia já resolveu. */
  genreId?: number | null;
  /** Código Camelot escolhido na roda da cabine. */
  camelot?: string | null;
  /** Modo do filtro na API. Default `exact`. */
  camelotMode?: CamelotFilterMode;
  /** Nome canônico Beatport enviado em `genre=`. */
  genre?: string | null;
  /** Subgênero canônico. */
  subgenre?: string | null;
  /** BPM mínimo enviado em `bpm_min`. */
  bpmMin?: number | null;
  /** BPM máximo enviado em `bpm_max`. */
  bpmMax?: number | null;
}

/**
 * Diz se o texto do filtro tem conteúdo além de espaço.
 *
 * @param value Campo opcional da query.
 */
function hasText(value: string | null | undefined): boolean {
  return (value?.trim() ?? "").length > 0;
}

/**
 * Indica se há critério mínimo para listar o catálogo remoto.
 *
 * O GET /api/catalog/tracks exige artist, track, release, label ou
 * genre/genre_id. `q` ficou legado e a collection não o envia mais.
 *
 * @param filters Busca e gênero ativos no browse.
 */
export function hasCatalogBrowseCriteria(filters: TrackLibraryFilters = {}): boolean {
  const genreId = filters.genreId ?? 0;
  return (
    hasText(filters.artist) ||
    hasText(filters.track) ||
    hasText(filters.release) ||
    hasText(filters.label) ||
    hasText(filters.genre) ||
    genreId > 0
  );
}

/**
 * Indica se a collection remota pode buscar faixas no modo atual.
 *
 * @param filters Modo, busca e gênero ativos no browse.
 */
export function canFetchRemoteCollection(filters: TrackLibraryFilters = {}): boolean {
  const mode = filters.collectionMode;
  if (!mode) return false;
  if (mode === "library") return true;
  return hasCatalogBrowseCriteria(filters);
}

/**
 * Mensagem de idle da lista conforme o modo da collection.
 *
 * @param filters Modo e filtros ativos no browse.
 */
export function remoteCollectionIdleCopy(filters: TrackLibraryFilters = {}): string | null {
  if (!filters.collectionMode) {
    return "Escolha biblioteca ou catálogo";
  }
  if (filters.collectionMode === "catalog" && !hasCatalogBrowseCriteria(filters)) {
    return "Busque artista, faixa, álbum, label ou escolha um gênero";
  }
  return null;
}

/**
 * Lista a biblioteca remota com paginação infinita.
 *
 * Biblioteca usa GET /api/tracks; catálogo usa GET /api/catalog/tracks e só dispara
 * com artist/track/release/label ou gênero. `placeholderData: keepPreviousData`
 * mantém a tabela anterior enquanto a Query busca de novo.
 *
 * @param source Fonte ativa do browse.
 * @param filters Modo, busca e filtros repassados à API.
 */
export function useTrackLibrary(source: BrowseSource, filters: TrackLibraryFilters = {}) {
  const collectionMode = filters.collectionMode ?? null;
  const artist = filters.artist?.trim() ?? "";
  const track = filters.track?.trim() ?? "";
  const release = filters.release?.trim() ?? "";
  const label = filters.label?.trim() ?? "";
  const camelot = filters.camelot ? normalizeCamelotCode(filters.camelot) : null;
  const camelotMode = filters.camelotMode ?? "exact";
  const genre = filters.genre?.trim() || "";
  const genreId = filters.genreId ?? null;
  const subgenre = filters.subgenre?.trim() || "";
  const bpmMin = filters.bpmMin ?? undefined;
  const bpmMax = filters.bpmMax ?? undefined;
  const canFetch = source === "remote" && canFetchRemoteCollection(filters);
  const libraryHaystack = track || artist || release || label;

  return useInfiniteQuery({
    queryKey: trackListKey(source, {
      collectionMode,
      artist,
      track,
      release,
      label,
      sort: "title",
      camelot,
      camelotMode,
      genre,
      subgenre,
      bpmMin,
      bpmMax,
    }),
    queryFn: ({ pageParam }) => {
      const api = getTracksApi();
      const shared = {
        limit: LIBRARY_LIST_DEFAULT_LIMIT,
        offset: pageParam,
        artist: artist || undefined,
        track: track || undefined,
        release: release || undefined,
        camelot: camelot ?? undefined,
        camelot_mode: camelot ? camelotMode : undefined,
        genre: genre || undefined,
        genre_id: genreId ?? undefined,
        subgenre: subgenre || undefined,
        bpm_min: bpmMin,
        bpm_max: bpmMax,
        label: label || undefined,
      };
      if (collectionMode === "catalog") {
        return api.listCatalogTracks(shared);
      }
      return api.listTracks({
        ...shared,
        q: libraryHaystack || undefined,
        sort: "title",
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: canFetch,
    staleTime: 60_000,
    retry: 1,
    placeholderData: keepPreviousData,
    networkMode: "always",
  });
}

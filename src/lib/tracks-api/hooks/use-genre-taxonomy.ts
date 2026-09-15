import { useQuery } from "@tanstack/react-query";
import type { BrowseSource, RemoteCollectionMode } from "../../../types/mixer";
import { getTracksApi } from "../index";
import { genreListKey, subgenreListKey } from "../query-keys";

/**
 * Lista a taxonomia Beatport para o painel de gênero da collection.
 *
 * @param source Fonte ativa. Só dispara em remote.
 * @param collectionMode Biblioteca ou catálogo; null mantém a lista de gênero vazia.
 */
export function useGenreTaxonomy(
  source: BrowseSource,
  collectionMode: RemoteCollectionMode | null,
) {
  return useQuery({
    queryKey: genreListKey(),
    queryFn: () => getTracksApi().listGenres(),
    enabled: source === "remote" && collectionMode !== null,
    staleTime: 300_000,
    retry: 1,
    networkMode: "always",
  });
}

/**
 * Lista subgêneros depois que um gênero pai foi escolhido.
 *
 * @param source Fonte ativa.
 * @param collectionMode Biblioteca ou catálogo; null desliga subgêneros.
 * @param genreId Id canônico do pai, ou null quando Todos está ativo.
 */
export function useSubgenreTaxonomy(
  source: BrowseSource,
  collectionMode: RemoteCollectionMode | null,
  genreId: number | null,
) {
  return useQuery({
    queryKey: subgenreListKey(genreId ?? 0),
    queryFn: () => getTracksApi().listSubgenres(genreId!),
    enabled: source === "remote" && collectionMode !== null && genreId !== null,
    staleTime: 300_000,
    retry: 1,
    networkMode: "always",
  });
}

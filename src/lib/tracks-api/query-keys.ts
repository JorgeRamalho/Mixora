/**
 * Chave da listagem remota.
 *
 * @param source Fonte do browse.
 * @param filters Busca, ordenação e filtro Camelot.
 */
export function trackListKey(
  source: string,
  filters: {
    collectionMode?: string | null;
    artist?: string | null;
    track?: string | null;
    release?: string | null;
    label?: string | null;
    sort?: string;
    camelot?: string | null;
    camelotMode?: string;
    genre?: string | null;
    subgenre?: string | null;
    bpmMin?: number | null;
    bpmMax?: number | null;
  } = {},
): readonly unknown[] {
  return [
    "tracks",
    "list",
    source,
    filters.collectionMode ?? "",
    filters.artist ?? "",
    filters.track ?? "",
    filters.release ?? "",
    filters.label ?? "",
    filters.sort ?? "title",
    filters.camelot ?? "",
    filters.camelotMode ?? "exact",
    filters.genre ?? "",
    filters.subgenre ?? "",
    filters.bpmMin ?? "",
    filters.bpmMax ?? "",
  ];
}

/**
 * Chave da taxonomia de gêneros.
 *
 * @param query Busca opcional por substring.
 */
export function genreListKey(query = ""): readonly unknown[] {
  return ["tracks", "genres", query];
}

/**
 * Chave dos subgêneros de um pai.
 *
 * @param genreId Id Beatport do gênero.
 */
export function subgenreListKey(genreId: number): readonly unknown[] {
  return ["tracks", "genres", genreId, "subgenres"];
}

/**
 * Chave do detalhe por track_id canônico.
 *
 * @param trackId Id estável da faixa.
 */
export function trackDetailKey(trackId: string): readonly unknown[] {
  return ["tracks", "detail", trackId];
}

/**
 * Chave da análise V8 por beatport_id.
 *
 * @param beatportId Chave de playback.
 */
export function trackAnalysisKey(beatportId: number): readonly unknown[] {
  return ["tracks", "analysis", beatportId];
}

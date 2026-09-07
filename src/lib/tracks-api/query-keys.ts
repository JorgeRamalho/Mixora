/**
 * Chave da listagem remota.
 *
 * @param source Fonte do browse.
 * @param filters Busca, ordenação e filtro Camelot.
 */
export function trackListKey(
  source: string,
  filters: {
    q?: string;
    sort?: string;
    camelot?: string | null;
    camelotMode?: string;
  } = {},
): readonly unknown[] {
  return [
    "tracks",
    "list",
    source,
    filters.q ?? "",
    filters.sort ?? "title",
    filters.camelot ?? "",
    filters.camelotMode ?? "exact",
  ];
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

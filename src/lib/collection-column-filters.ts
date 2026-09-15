import type { BrowseTrackItem } from "../types/mixer";
import { normalizeCamelotCode } from "./musical-key";

/** Campos digitáveis sob o header da collection. */
export type CollectionColumnFilterField =
  | "artist"
  | "title"
  | "album"
  | "bpm"
  | "camelot"
  | "label";

/** Recorte AND por coluna, persistido na sessão de browse. */
export interface CollectionColumnFilters {
  artist: string;
  title: string;
  album: string;
  bpm: string;
  camelot: string;
  label: string;
}

/** Faixa de BPM extraída do input da coluna, quando o texto é numérico. */
export interface CollectionBpmRange {
  min: number | undefined;
  max: number | undefined;
}

/** Query derivada das colunas para GET /api/tracks e GET /api/catalog/tracks. */
export interface CollectionLibraryQuery {
  artist: string;
  track: string;
  release: string;
  label: string;
  bpmMin: number | undefined;
  bpmMax: number | undefined;
  columnCamelot: string | null;
}

/** Estado vazio das colunas, sem recorte extra. */
export const EMPTY_COLLECTION_COLUMN_FILTERS: CollectionColumnFilters = {
  artist: "",
  title: "",
  album: "",
  bpm: "",
  camelot: "",
  label: "",
};

/**
 * Clona os filtros de coluna para não compartilhar a referência do vazio.
 *
 * @param filters Recorte atual ou o vazio canônico.
 */
export function cloneCollectionColumnFilters(
  filters: CollectionColumnFilters = EMPTY_COLLECTION_COLUMN_FILTERS,
): CollectionColumnFilters {
  return {
    artist: filters.artist,
    title: filters.title,
    album: filters.album,
    bpm: filters.bpm,
    camelot: filters.camelot,
    label: filters.label,
  };
}

/**
 * Compara dois recortes de coluna campo a campo.
 *
 * @param left Recorte A.
 * @param right Recorte B.
 */
export function areCollectionColumnFiltersEqual(
  left: CollectionColumnFilters,
  right: CollectionColumnFilters,
): boolean {
  return (
    left.artist === right.artist &&
    left.title === right.title &&
    left.album === right.album &&
    left.bpm === right.bpm &&
    left.camelot === right.camelot &&
    left.label === right.label
  );
}

/**
 * Diz se alguma coluna tem texto além de espaço.
 *
 * @param filters Recorte da collection.
 */
export function hasCollectionColumnFilters(filters: CollectionColumnFilters): boolean {
  return (
    filters.artist.trim() !== "" ||
    filters.title.trim() !== "" ||
    filters.album.trim() !== "" ||
    filters.bpm.trim() !== "" ||
    filters.camelot.trim() !== "" ||
    filters.label.trim() !== ""
  );
}

/**
 * Monta o haystack legado de GET /api/tracks, que ainda documenta `q`.
 *
 * O catálogo não usa este valor. Título vem primeiro porque é o recorte mais
 * específico, e artista, álbum e label só entram se as colunas à esquerda
 * estiverem vazias.
 *
 * @param filters Recorte digitado nas colunas.
 */
export function composeLibraryHaystackQuery(filters: CollectionColumnFilters): string {
  return (
    filters.title.trim() ||
    filters.artist.trim() ||
    filters.album.trim() ||
    filters.label.trim()
  );
}

/**
 * Monta a query remota a partir das colunas, sem o filtro da roda Camelot.
 *
 * @param filters Recorte digitado nas colunas.
 */
export function resolveCollectionLibraryQuery(
  filters: CollectionColumnFilters,
): CollectionLibraryQuery {
  const bpmRange = parseCollectionBpmRange(filters.bpm);
  return {
    artist: filters.artist.trim(),
    track: filters.title.trim(),
    release: filters.album.trim(),
    label: filters.label.trim(),
    bpmMin: bpmRange?.min,
    bpmMax: bpmRange?.max,
    columnCamelot: normalizeCamelotCode(filters.camelot.trim()) ?? null,
  };
}

/**
 * Lê BPM exato, intervalo `120-128` ou mínimo `120+`.
 *
 * Texto que não fecha nesses formatos devolve null, e aí a coluna cai no
 * match por substring no cliente.
 *
 * @param raw Valor digitado na coluna BPM.
 */
export function parseCollectionBpmRange(raw: string): CollectionBpmRange | null {
  const value = raw.trim();
  if (!value) return null;

  const exact = /^(\d{2,3})$/.exec(value);
  if (exact) {
    const bpm = Number(exact[1]);
    return { min: bpm, max: bpm };
  }

  const plus = /^(\d{2,3})\+$/.exec(value);
  if (plus) {
    return { min: Number(plus[1]), max: undefined };
  }

  const range = /^(\d{2,3})\s*-\s*(\d{2,3})$/.exec(value);
  if (!range) return null;

  const first = Number(range[1]);
  const second = Number(range[2]);
  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
}

/**
 * Aplica o AND das colunas no item já mapeado da collection.
 *
 * A API agora recebe artist/track/release/label. O cliente ainda recorta por
 * campo nas páginas já carregadas, senão um needle parcial vaza entre colunas.
 *
 * @param track Linha visível da collection.
 * @param filters Recorte digitado nas colunas.
 */
export function matchesCollectionColumnFilters(
  track: BrowseTrackItem,
  filters: CollectionColumnFilters,
): boolean {
  if (!containsNeedle(track.artist, filters.artist)) return false;
  if (!containsNeedle(track.title, filters.title)) return false;
  if (!containsNeedle(track.albumOrMix, filters.album)) return false;
  if (!matchesBpmColumn(track.bpm, filters.bpm)) return false;
  if (!containsNeedle(track.key, filters.camelot)) return false;
  if (!containsNeedle(track.label, filters.label)) return false;
  return true;
}

/**
 * Recorta a lista já paginada pelo AND das colunas.
 *
 * @param tracks Faixas mapeadas da API.
 * @param filters Recorte digitado nas colunas.
 */
export function filterTracksByCollectionColumns(
  tracks: readonly BrowseTrackItem[],
  filters: CollectionColumnFilters,
): readonly BrowseTrackItem[] {
  if (!hasCollectionColumnFilters(filters)) return tracks;
  return tracks.filter((track) => matchesCollectionColumnFilters(track, filters));
}

/**
 * Diz se o haystack contém o needle, ignorando caixa.
 *
 * @param haystack Campo da faixa, possivelmente nulo.
 * @param raw Needle digitado. Vazio passa.
 */
function containsNeedle(haystack: string | null | undefined, raw: string): boolean {
  const needle = raw.trim().toLowerCase();
  if (!needle) return true;
  return (haystack ?? "").trim().toLowerCase().includes(needle);
}

/**
 * Filtra BPM por intervalo numérico quando o texto fecha, senão por substring.
 *
 * @param bpm BPM da faixa.
 * @param raw Valor da coluna BPM.
 */
function matchesBpmColumn(bpm: number | null, raw: string): boolean {
  const needle = raw.trim();
  if (!needle) return true;
  const range = parseCollectionBpmRange(needle);
  if (!range) {
    return bpm !== null && String(bpm).includes(needle);
  }
  if (bpm === null) return false;
  if (range.min !== undefined && bpm < range.min) return false;
  if (range.max !== undefined && bpm > range.max) return false;
  return true;
}

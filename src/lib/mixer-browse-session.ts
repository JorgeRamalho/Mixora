import type { RemoteCollectionMode } from "../types/mixer";
import {
  areCollectionColumnFiltersEqual,
  cloneCollectionColumnFilters,
  EMPTY_COLLECTION_COLUMN_FILTERS,
  type CollectionColumnFilters,
} from "./collection-column-filters";
import type { CamelotFilterMode } from "./tracks-api/types";

/** Estado de UI do browse que deve sobreviver à navegação entre rotas. */
export interface BrowseSessionSnapshot {
  cursor: number;
  /** Biblioteca por padrão no CDJ virtual; null esconde a taxonomia de gênero. */
  collectionMode: RemoteCollectionMode | null;
  genreFilter: string | null;
  genreId: number | null;
  subgenreFilter: string | null;
  q: string;
  /** Recorte AND digitado sob o header da collection. */
  columnFilters: CollectionColumnFilters;
  browseKeyFilter: string | null;
  browseCamelotMode: CamelotFilterMode;
}

type BrowseSessionListener = () => void;

const listeners = new Set<BrowseSessionListener>();

const EMPTY_SESSION: BrowseSessionSnapshot = {
  cursor: 0,
  collectionMode: "library",
  genreFilter: null,
  genreId: null,
  subgenreFilter: null,
  q: "",
  columnFilters: cloneCollectionColumnFilters(),
  browseKeyFilter: null,
  browseCamelotMode: "compatible",
};

let snapshot: BrowseSessionSnapshot = { ...EMPTY_SESSION };

/**
 * Snapshot atual da sessão de browse, para hidratar o MixerBoard sem perder
 * cursor e filtros ao sair de `/mixer`.
 */
export function getBrowseSessionSnapshot(): BrowseSessionSnapshot {
  return snapshot;
}

/**
 * Inscreve o React nas mudanças da sessão de browse.
 *
 * @param listener Callback disparado após cada atualização.
 */
export function subscribeBrowseSession(listener: BrowseSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Mescla um patch no snapshot da sessão e notifica os inscritos.
 *
 * @param patch Campos parciais a atualizar.
 */
export function updateBrowseSession(patch: Partial<BrowseSessionSnapshot>): void {
  snapshot = {
    cursor: patch.cursor ?? snapshot.cursor,
    collectionMode:
      patch.collectionMode !== undefined ? patch.collectionMode : snapshot.collectionMode,
    genreFilter: patch.genreFilter !== undefined ? patch.genreFilter : snapshot.genreFilter,
    genreId: patch.genreId !== undefined ? patch.genreId : snapshot.genreId,
    subgenreFilter: patch.subgenreFilter !== undefined ? patch.subgenreFilter : snapshot.subgenreFilter,
    q: patch.q ?? snapshot.q,
    columnFilters:
      patch.columnFilters !== undefined
        ? cloneCollectionColumnFilters(patch.columnFilters)
        : snapshot.columnFilters,
    browseKeyFilter: patch.browseKeyFilter !== undefined ? patch.browseKeyFilter : snapshot.browseKeyFilter,
    browseCamelotMode: patch.browseCamelotMode ?? snapshot.browseCamelotMode,
  };
  for (const listener of listeners) listener();
}

/**
 * Grava o cursor compartilhado da collection.
 *
 * @param index Posição na lista filtrada.
 */
export function setBrowseCursor(index: number): void {
  updateBrowseSession({ cursor: index });
}

/**
 * Zera cursor e filtros ao trocar a fonte USB/API.
 */
export function resetBrowseSessionForSourceChange(): void {
  snapshot = {
    ...EMPTY_SESSION,
    columnFilters: cloneCollectionColumnFilters(),
  };
  for (const listener of listeners) listener();
}

/**
 * Grava o recorte das colunas e zera o cursor da lista filtrada.
 *
 * @param filters Texto digitado em Artista, Faixa, Álbum, BPM, Camelot e Label.
 */
export function setCollectionColumnFilters(filters: CollectionColumnFilters): void {
  if (areCollectionColumnFiltersEqual(snapshot.columnFilters, filters)) {
    return;
  }
  updateBrowseSession({
    columnFilters: filters,
    cursor: 0,
  });
}

/**
 * Hidrata a sessão na primeira montagem quando ainda está nos defaults.
 *
 * @param cursor Cursor calculado a partir da faixa carregada no engine.
 */
export function seedBrowseSessionIfPristine(cursor: number): void {
  const pristine =
    snapshot.cursor === 0 &&
    snapshot.collectionMode === "library" &&
    snapshot.genreFilter === null &&
    snapshot.genreId === null &&
    snapshot.subgenreFilter === null &&
    snapshot.q === "" &&
    areCollectionColumnFiltersEqual(snapshot.columnFilters, EMPTY_COLLECTION_COLUMN_FILTERS) &&
    snapshot.browseKeyFilter === null &&
    snapshot.browseCamelotMode === "compatible";
  if (!pristine) return;
  updateBrowseSession({ cursor });
}

import type { MixerSnapshot } from "../types/mixer";
import type { BrowseTrackItem } from "../types/mixer";
import type { LibraryTrack } from "./tracks-api/types";
import type { CamelotFilterMode } from "./tracks-api/types";
import { matchesCamelotFilter } from "./musical-key";

export type LocalCollectionFilters = {
  keyFilter: string | null;
  camelotMode: CamelotFilterMode;
  genre: string | null;
  q: string;
};

/**
 * Recorta o catálogo USB por Camelot, gênero e busca livre.
 *
 * @param catalog Lista completa da fonte local.
 * @param filters Filtros da sessão de collection.
 */
export function filterLocalCollection(
  catalog: readonly BrowseTrackItem[],
  filters: LocalCollectionFilters,
): readonly BrowseTrackItem[] {
  const needle = filters.q.trim().toLowerCase();
  const genreNeedle = filters.genre?.trim().toLowerCase() ?? "";
  return catalog.filter((track) => {
    if (filters.keyFilter && !matchesCamelotFilter(track.key, filters.keyFilter, filters.camelotMode)) {
      return false;
    }
    if (genreNeedle && (track.genre ?? "").trim().toLowerCase() !== genreNeedle) {
      return false;
    }
    if (!needle) return true;
    const haystack = [track.title, track.artist, track.genre]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/**
 * Gêneros únicos do catálogo USB, ordenados pelo nome.
 *
 * @param catalog Faixas de treino já mapeadas.
 */
export function uniqueLocalGenres(catalog: readonly BrowseTrackItem[]): string[] {
  const names = new Set<string>();
  for (const track of catalog) {
    const genre = track.genre?.trim();
    if (genre) names.add(genre);
  }
  return [...names].sort((left, right) => left.localeCompare(right, "pt", { sensitivity: "base" }));
}

/**
 * Filtra a biblioteca pelo tom Camelot, sem afetar outros recortes.
 *
 * @param catalog Lista completa da fonte ativa.
 * @param keyFilter Tom escolhido no picker, ou null para listar tudo.
 * @param mode Modo exato ou compatível do filtro Camelot.
 */
export function filterBrowseTracks(
  catalog: readonly BrowseTrackItem[],
  keyFilter: string | null,
  mode: CamelotFilterMode,
): readonly BrowseTrackItem[] {
  if (!keyFilter) return catalog;
  return catalog.filter((track) => matchesCamelotFilter(track.key, keyFilter, mode));
}

/**
 * Converte uma linha da API remota no item da collection.
 *
 * @param track Faixa retornada pelo MusicDiscover.
 */
export function mapRemoteBrowseTrack(track: LibraryTrack): BrowseTrackItem {
  const camelot = track.camelot ?? track.key;
  return {
    id: track.track_id,
    title: track.title,
    artist: track.artists,
    albumOrMix: track.mix_name,
    genre: track.genre,
    bpm: track.bpm,
    key: camelot,
    musicalKey: track.key,
    label: track.label,
    durationMs: track.length_ms,
    waveformPreview: track.waveform_preview ?? null,
  };
}

/**
 * Prende o cursor da biblioteca dentro da lista dando a volta nas pontas.
 *
 * @param index Índice cru, possivelmente fora da lista.
 * @param total Tamanho da lista. Zero devolve 0 para não dividir por zero.
 */
export function wrapCursor(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

/**
 * Índice da track que o deck master toca, que é onde o cursor se realinha.
 *
 * @param snapshot Snapshot da cabine.
 * @param trackIds Lista de ids na ordem do browse.
 */
export function masterTrackIndex(
  snapshot: MixerSnapshot,
  trackIds: readonly string[],
): number {
  const id = snapshot[snapshot.masterDeck].track.id;
  const found = trackIds.indexOf(id);
  return found < 0 ? 0 : found;
}

/**
 * Estado de browse injetável. O cursor é de tela, e por isso o dispatcher
 * não lê o snapshot do engine para saber qual faixa o LOAD deve mandar.
 */
export type BrowseState = {
  getCursor(): number;
  setCursor(index: number): void;
  resolveTrackId(index: number): string | null;
  masterTrackIndex(): number;
};

/**
 * Monta o estado de browse a partir da collection compartilhada.
 *
 * @param tracks Faixas na ordem do encoder.
 * @param getCursor Lê o cursor corrente, em geral de um ref.
 * @param setCursor Grava o cursor já preso à lista.
 * @param snapshot Lê o snapshot para realinhar no master.
 */
export function createBrowseState(options: {
  tracks: readonly { id: string }[];
  getCursor: () => number;
  setCursor: (index: number) => void;
  snapshot: () => MixerSnapshot;
}): BrowseState {
  const { tracks, getCursor, setCursor, snapshot } = options;
  const ids = tracks.map((track) => track.id);

  return {
    getCursor,
    setCursor(index: number) {
      setCursor(wrapCursor(index, tracks.length));
    },
    resolveTrackId(index: number) {
      return tracks[wrapCursor(index, tracks.length)]?.id ?? null;
    },
    masterTrackIndex() {
      return masterTrackIndex(snapshot(), ids);
    },
  };
}


import type { BrowseSource, MixerSnapshot } from "../types/mixer";
import type { BrowseTrackItem, DeckId } from "../types/mixer";
import type { LibraryTrack } from "./tracks-api/types";
import type { CamelotFilterMode } from "./tracks-api/types";
import { matchesCamelotFilter } from "./musical-key";

export type DeckKeyFilters = Record<DeckId, string | null>;

/** Filtros Camelot vazios para cada deck da cabine. */
export const EMPTY_DECK_KEY_FILTERS: DeckKeyFilters = { a: null, b: null };

/**
 * Filtra a biblioteca pelo tom Camelot de um deck, sem afetar o outro lado.
 *
 * @param catalog Lista completa da fonte ativa.
 * @param keyFilter Tom escolhido no picker do deck, ou null para listar tudo.
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
 * Converte uma linha da API remota no item usado pelas playlists laterais.
 *
 * @param track Faixa retornada pelo MusicDiscover.
 */
export function mapRemoteBrowseTrack(track: LibraryTrack): BrowseTrackItem {
  return {
    id: track.track_id,
    title: track.title,
    artist: track.artists,
    bpm: track.bpm,
    key: track.camelot ?? track.key,
  };
}

/**
 * Prende o cursor da biblioteca dentro da lista dando a volta nas pontas.
 *
 * O módulo é aplicado duas vezes de propósito, porque `-1 % 5` devolve `-1`
 * em JavaScript, e não `4`, ou seja o operador preserva o sinal do dividendo.
 * Sem a segunda soma, girar o encoder para trás na primeira track levaria o
 * cursor a um índice negativo.
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
 * Monta o estado de browse a partir da lista de treino e de um cursor
 * controlado pela tela.
 *
 * @param tracks Faixas na ordem do encoder.
 * @param getCursor Lê o cursor corrente, em geral de um ref.
 * @param setCursor Grava o cursor já preso à lista.
 * @param snapshot Lê o snapshot para o BACK realinhar no master.
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

/**
 * Lê a fonte do browse persistida na sessão. Sem valor, a cabine nasce em local.
 */
export function loadBrowseSource(): BrowseSource {
  if (typeof sessionStorage === "undefined") return "local";
  try {
    return sessionStorage.getItem("mamute.browse.source") === "remote" ? "remote" : "local";
  } catch {
    return "local";
  }
}

/**
 * Grava a fonte do browse para o toggle sobreviver a um reload da página.
 *
 * @param source Fonte escolhida no chip.
 */
export function saveBrowseSource(source: BrowseSource): void {
  try {
    sessionStorage.setItem("mamute.browse.source", source);
  } catch {
    return;
  }
}

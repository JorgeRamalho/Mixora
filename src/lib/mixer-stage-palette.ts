import { getCamelotKey } from "./musical-key";
import { DEFAULT_WAVEFORM_ACCENT, mixHex } from "./waveform-palette";

/** Entrada mínima do snapshot para pintar o palco com a hora Camelot. */
export type MixerStagePaletteInput = {
  keyA: string;
  keyB: string;
  playingA: boolean;
  playingB: boolean;
  crossfader: number;
};

/** Cores A/B e a mistura do que está tocando de verdade. */
export type MixerStagePalette = {
  camelotA: string;
  camelotB: string;
  camelotLive: string;
  playing: boolean;
};

/**
 * Limita o crossfader ao intervalo 0–1 usado pelo `mixHex`.
 *
 * @param value Posição do crossfader, possivelmente fora da faixa.
 */
function clampCrossfader(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

/**
 * Resolve a cor Camelot de um tom de deck, com fallback neutro.
 *
 * @param key Código Camelot da faixa carregada.
 */
function colorForKey(key: string): string {
  return getCamelotKey(key)?.color ?? DEFAULT_WAVEFORM_ACCENT;
}

/**
 * Monta a paleta do palco: A e B seguem as faixas carregadas, e `camelotLive`
 * segue o que está tocando. Os dois decks tocando misturam pela posição do
 * crossfader, ao passo que um deck só pinta com a própria hora. Pausado, a
 * mistura 50/50 das faixas carregadas permanece, mas `playing` fica falso
 * para o CSS reduzir o neon.
 *
 * @param input Tons, flags de play e crossfader do snapshot da cabine.
 */
export function resolveMixerStagePalette(input: MixerStagePaletteInput): MixerStagePalette {
  const camelotA = colorForKey(input.keyA);
  const camelotB = colorForKey(input.keyB);
  const playing = input.playingA || input.playingB;
  let camelotLive = mixHex(camelotA, camelotB, 0.5);

  if (input.playingA && input.playingB) {
    camelotLive = mixHex(camelotA, camelotB, clampCrossfader(input.crossfader));
  } else if (input.playingA) {
    camelotLive = camelotA;
  } else if (input.playingB) {
    camelotLive = camelotB;
  }

  return { camelotA, camelotB, camelotLive, playing };
}

/**
 * Converte a paleta em custom properties para o palco e o chrome.
 *
 * @param palette Paleta já resolvida do snapshot.
 */
export function mixerStagePaletteCssVars(palette: MixerStagePalette): Record<string, string> {
  return {
    "--camelot-a": palette.camelotA,
    "--camelot-b": palette.camelotB,
    "--camelot-live": palette.camelotLive,
  };
}

/**
 * Espelha a paleta no `html`, para o header, o haze e o fundo herdarem a hora.
 *
 * @param palette Paleta ao vivo da cabine.
 * @param root Elemento raiz, o `documentElement` na página.
 */
export function applyMixerStageTheme(
  palette: MixerStagePalette,
  root: HTMLElement = document.documentElement,
): void {
  const vars = mixerStagePaletteCssVars(palette);
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  root.setAttribute("data-mixer-playing", palette.playing ? "true" : "false");
}

/**
 * Remove a paleta do `html` ao sair da rota, para o resto do site não herdar
 * a hora da cabine.
 *
 * @param root Elemento raiz, o `documentElement` na página.
 */
export function clearMixerStageTheme(root: HTMLElement = document.documentElement): void {
  root.style.removeProperty("--camelot-a");
  root.style.removeProperty("--camelot-b");
  root.style.removeProperty("--camelot-live");
  root.removeAttribute("data-mixer-playing");
}

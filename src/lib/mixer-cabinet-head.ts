const STORAGE_KEY = "mamute.mixer.cabinetHeadHidden";

/**
 * Lê se a barra interna da cabine deve ficar oculta para ampliar os decks.
 * Sem valor persistido, a barra nasce visível.
 */
export function loadCabinetHeadHidden(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Persiste a preferência de ocultar a barra interna da cabine.
 *
 * @param hidden True quando browse e MIDI saem para o chrome global.
 */
export function saveCabinetHeadHidden(hidden: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
  } catch {
    return;
  }
}

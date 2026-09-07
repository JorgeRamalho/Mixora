import type { MixerAction } from "../types/mixer";
import { getActionRoute } from "./mixer-action-routing";

/**
 * O contrato só trava em desenvolvimento. No bundle de produção o Vite
 * substitui `import.meta.env.DEV` por `false`, e o throw some.
 */
function mixerContractEnabled(): boolean {
  const env = (import.meta as ImportMeta & { env?: { DEV?: boolean; MODE?: string } }).env;
  if (env?.DEV === false || env?.MODE === "production") return false;
  return true;
}

/**
 * Primeira linha do reducer: intenção e browse não podem chegar aqui, porque
 * o StrictMode aplicaria o gesto duas vezes.
 *
 * @param action Ação que o `useReducer` recebeu.
 */
export function assertAllowedInReducer(action: MixerAction): void {
  if (!mixerContractEnabled()) return;
  const route = getActionRoute(action.type);
  if (route === "dispatch-only") {
    throw new Error(
      `[MixerContract] ${action.type} é dispatch-only e não pode entrar no reducer`,
    );
  }
}

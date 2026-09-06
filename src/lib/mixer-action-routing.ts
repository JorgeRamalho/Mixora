import type { MixerAction } from "../types/mixer";

/**
 * Quem tem permissão de receber cada `MixerAction`.
 *
 * `dispatch-only` é intenção ou browse: o `createMixerDispatch` resolve e o
 * reducer **não** pode ver o tipo cru. `reducer-only` é absoluto e entra no
 * `useReducer`. `reducer-direct` é o timer de phase, que chama `dispatch`
 * sem passar pelo dispatcher.
 */
export type MixerActionRoute = "dispatch-only" | "reducer-only" | "reducer-direct";

/**
 * Tabela do union. Um `type` novo no `MixerAction` que não aparecer aqui
 * vira erro de compilação, porque a chave é `MixerAction["type"]`.
 */
export const MIXER_ACTION_ROUTES: Record<MixerAction["type"], MixerActionRoute> = {
  refresh: "reducer-direct",
  toggle: "dispatch-only",
  pitch: "reducer-only",
  gain: "reducer-only",
  trim: "reducer-only",
  filter: "reducer-only",
  eq: "reducer-only",
  xf: "reducer-only",
  master: "reducer-only",
  booth: "reducer-only",
  cueMix: "reducer-only",
  masterCue: "reducer-only",
  toggleMasterCue: "dispatch-only",
  sync: "reducer-only",
  toggleSync: "dispatch-only",
  masterDeck: "reducer-only",
  cueMonitor: "reducer-only",
  toggleCueMonitor: "dispatch-only",
  jogMode: "reducer-only",
  quantize: "reducer-only",
  loadTrack: "reducer-only",
  callCue: "reducer-only",
  setCue: "reducer-only",
  cuePress: "dispatch-only",
  cueRelease: "dispatch-only",
  toggleLoop: "dispatch-only",
  loopOn: "dispatch-only",
  loopOff: "dispatch-only",
  setLoopIn: "dispatch-only",
  setLoopOut: "dispatch-only",
  loopHalve: "dispatch-only",
  loopDouble: "dispatch-only",
  setBeatLoop: "dispatch-only",
  jumpBeats: "dispatch-only",
  scratchBegin: "dispatch-only",
  scratchTick: "dispatch-only",
  scratchEnd: "dispatch-only",
  hotCue: "reducer-only",
  triggerHotCue: "reducer-only",
  hotCuePad: "dispatch-only",
  nudge: "dispatch-only",
  browseMove: "dispatch-only",
  browseLoad: "dispatch-only",
  browseHome: "dispatch-only",
  requestDeckLoad: "dispatch-only",
  loadDeckFile: "dispatch-only",
  loadRemoteTrack: "dispatch-only",
  setDeckMeta: "reducer-only",
};

/**
 * Devolve a rota da ação, ou `undefined` se o tipo ainda não estiver na tabela.
 *
 * @param type Discriminante do union.
 */
export function getActionRoute(type: MixerAction["type"]): MixerActionRoute {
  return MIXER_ACTION_ROUTES[type];
}

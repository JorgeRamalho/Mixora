/**
 * Fila de ações MIDI de um frame, para a controladora não clonar o snapshot a
 * cada byte.
 *
 * Um fader de 14 bits manda MSB e LSB em rajada, e o jog manda dezenas de CCs
 * por segundo. Sem fila, cada milímetro de curso dispara dois `dispatch` e
 * dois `cloneSnapshot`. Com fila, o hook descarrega uma vez por
 * `requestAnimationFrame`.
 *
 * O ponto delicado é que **não** existe uma regra única de agrupamento, porque
 * as ações da cabine têm três naturezas distintas. Tratar todas como a
 * primeira é o erro que faria o prato andar um décimo do gesto.
 *
 * A fila garante **ordem de gesto**, e não só agrupamento. Uma ação imediata
 * esvazia o que estava pendente antes de sair, porque ela costuma depender do
 * que o DJ acabou de fazer: girar o BROWSE e apertar LOAD na mesma fração de
 * segundo tem de carregar a faixa nova, e não a anterior, do mesmo modo que um
 * pad apertado no fim de um scratch grava a fase de onde a roda parou.
 */

import type { DeckId, MixerAction } from "../../types/mixer";

/**
 * Como uma ação atravessa a fila.
 *
 * `continuous` é knob e fader, cujo valor é absoluto, e por isso o último byte
 * do frame substitui os anteriores sem perda. `accumulate` é o jog, cujo valor
 * é um passo relativo, e por isso descartar os intermediários encurtaria o
 * gesto. `immediate` é botão, que não espera frame porque clique não é rajada e
 * o atraso apareceria como input lag no transporte.
 */
export type CoalesceMode = "continuous" | "accumulate" | "immediate";

/**
 * Classifica a ação pela natureza do seu valor.
 *
 * @param action Ação já mapeada a partir do MIDI.
 */
export function coalesceMode(action: MixerAction): CoalesceMode {
  switch (action.type) {
    case "gain":
    case "trim":
    case "filter":
    case "eq":
    case "xf":
    case "master":
    case "booth":
    case "cueMix":
    case "pitch":
      return "continuous";
    case "nudge":
    case "browseMove":
      return "accumulate";
    default:
      return "immediate";
  }
}

/**
 * Chave de agrupamento de uma ação contínua.
 *
 * O deck e a banda entram na chave, senão o EQ HIGH do deck A engoliria o LOW
 * do deck B no mesmo frame.
 *
 * @param action Ação contínua, ou seja, cuja `coalesceMode` é `continuous`.
 */
export function coalesceKey(action: MixerAction): string {
  if (action.type === "eq") return `eq:${action.id}:${action.band}`;
  if ("id" in action) return `${action.type}:${action.id}`;
  return action.type;
}

export interface MidiActionQueue {
  /**
   * Enfileira a ação e devolve o que precisa ir agora, já em ordem de gesto.
   *
   * @returns Lista vazia quando a ação fica guardada até o `drain`. Quando ela
   * é `immediate`, a lista traz **primeiro** o que estava pendente e só então a
   * própria ação, senão o botão atropelaria o giro que veio antes dele.
   */
  push: (action: MixerAction) => MixerAction[];
  /** Esvazia a fila do frame, na ordem em que os controles chegaram. */
  drain: () => MixerAction[];
  /** Diz se há algo guardado, para o hook não agendar frame à toa. */
  isEmpty: () => boolean;
}

/**
 * Cria a fila mutável de um frame.
 *
 * O `Map` preserva a ordem de inserção, e por isso dois knobs girados juntos
 * chegam ao reducer na ordem em que o DJ os tocou.
 */
export function createMidiActionQueue(): MidiActionQueue {
  const continuous = new Map<string, MixerAction>();
  const steps = new Map<DeckId, number>();
  let browse = 0;

  /** Esvazia os três acumuladores na ordem em que os controles chegaram. */
  function drainAll(): MixerAction[] {
    const out = [...continuous.values()];
    continuous.clear();

    for (const [id, total] of steps) {
      const direction = total < 0 ? -1 : 1;
      for (let step = 0; step < Math.abs(total); step += 1) {
        out.push({ type: "nudge", id, direction });
      }
    }
    steps.clear();

    // O encoder sai numa ação só com a soma, ao contrário do `nudge`, porque
    // quem o aplica é uma função de UI que já soma e dá a volta na lista, ao
    // passo que `engine.nudge` precisa de uma chamada por passo.
    if (browse !== 0) {
      out.push({ type: "browseMove", delta: browse });
      browse = 0;
    }

    return out;
  }

  return {
    push(action) {
      if (coalesceMode(action) === "immediate") {
        // O botão não espera frame, mas também não fura a fila: o que estava
        // pendente sai antes dele. Sem isso, apertar LOAD no mesmo frame de um
        // clique de BROWSE carregaria a faixa anterior, porque o cursor ainda
        // não teria andado.
        return [...drainAll(), action];
      }
      if (action.type === "nudge") {
        steps.set(action.id, (steps.get(action.id) ?? 0) + action.direction);
        return [];
      }
      if (action.type === "browseMove") {
        browse += action.delta;
        return [];
      }
      continuous.set(coalesceKey(action), action);
      return [];
    },

    drain: drainAll,

    isEmpty() {
      return continuous.size === 0 && steps.size === 0 && browse === 0;
    },
  };
}

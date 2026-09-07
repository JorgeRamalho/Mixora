import { useCallback, useEffect, useRef, useState } from "react";
import type { MixerAction } from "../../types/mixer";
import type { MixerDispatch } from "../mixer-dispatch";
import { createDdj400MapContext, mapDdj400 } from "./ddj-400-map";
import { createMidiActionQueue } from "./midi-coalesce";
import {
  getMidiSnapshot,
  injectMidiBytes,
  restartMidiSession,
  startMidiSession,
  subscribeMidiBytes,
  subscribeMidiStatus,
  type MidiLinkStatus,
} from "./midi-session";
import { parseMidiMessage } from "./parse-message";

const LIVE_MS = 220;

/**
 * Latência decomposta do último gesto que chegou até a tela.
 *
 * A decomposição existe porque um número só não diz onde apertar quando o
 * total estoura: `midiToMapMs` alto acusa a fila do browser ou outro software
 * na porta, ao passo que `dispatchToPaintMs` alto acusa o custo do clone do
 * snapshot e do React.
 */
export interface MidiLatency {
  /** Do instante da mensagem até o fim do mapeamento. */
  midiToMapMs: number;
  /** Do fim do mapeamento até o `dispatch`, que num CC inclui o frame de espera. */
  mapToDispatchMs: number;
  /** Do `dispatch` até o layout já com o snapshot novo. */
  dispatchToPaintMs: number;
  /** Da mensagem até a tela, ou seja a soma das três etapas. */
  totalMs: number;
}

export interface MidiControllerState {
  status: MidiLinkStatus;
  deviceName: string | null;
  ports: string[];
  lastHeard: string | null;
  error: string | null;
  live: boolean;
  latency: MidiLatency | null;
  connect: () => void;
  markPainted: () => void;
}

/** Estágios cronometrados do gesto em voo, guardados fora do estado do React. */
interface LatencyProbe {
  timeStamp: number;
  mapEnd: number;
  dispatchAt: number;
  armed: boolean;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Liga a Web MIDI ao `dispatch` da cabine.
 *
 * Nada aqui despacha por byte. Knob e fader entram na fila de
 * `midi-coalesce` e saem uma vez por `requestAnimationFrame`, ao passo que
 * botão sai na hora, porque esperar frame num clique apareceria como input
 * lag. Sair na hora **não** significa furar a fila, e sim levar o pendente
 * consigo, senão um botão que depende do gesto anterior leria estado velho. O
 * rótulo do chip acompanha o mesmo frame, senão o diagnóstico re-renderizaria
 * a cabine a cada mensagem e desfaria o ganho da fila.
 *
 * @param onAction Callback do dispatcher (`MixerDispatch`), que recebe cada
 * `MixerAction` mapeada a partir de uma mensagem da DDJ-400. Não é o reducer
 * cru: intenções passam por `createMixerDispatch` antes.
 */
export function useMidiController(onAction: MixerDispatch): MidiControllerState {
  const onActionRef = useRef(onAction);
  const ctxRef = useRef(createDdj400MapContext());
  const queueRef = useRef(createMidiActionQueue());
  const heardRef = useRef<string | null>(null);
  const frameRef = useRef(0);
  const liveTimerRef = useRef(0);
  const probeRef = useRef<LatencyProbe>({ timeStamp: 0, mapEnd: 0, dispatchAt: 0, armed: false });
  const initial = getMidiSnapshot();
  const [status, setStatus] = useState<MidiLinkStatus>(initial.status);
  const [deviceName, setDeviceName] = useState<string | null>(initial.deviceName);
  const [ports, setPorts] = useState<string[]>(initial.ports);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initial.error);
  const [live, setLive] = useState(false);
  const [latency, setLatency] = useState<MidiLatency | null>(null);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  /**
   * Fecha a conta do gesto quando o layout já tem o snapshot novo.
   *
   * Só mede se houve `dispatch` de MIDI pendente, e por isso o `refresh`
   * periódico da cabine e os cliques de mouse não sujam o número.
   */
  const markPainted = useCallback(() => {
    const probe = probeRef.current;
    if (!probe.armed) return;
    probe.armed = false;

    const paintedAt = performance.now();
    setLatency({
      midiToMapMs: round1(probe.mapEnd - probe.timeStamp),
      mapToDispatchMs: round1(probe.dispatchAt - probe.mapEnd),
      dispatchToPaintMs: round1(paintedAt - probe.dispatchAt),
      totalMs: round1(paintedAt - probe.timeStamp),
    });
  }, []);

  const dispatchTimed = useCallback((action: MixerAction) => {
    probeRef.current.dispatchAt = performance.now();
    probeRef.current.armed = true;
    onActionRef.current(action);
  }, []);

  /**
   * Descarrega o frame, primeiro o diagnóstico e depois as ações na ordem em
   * que os controles foram tocados.
   */
  const flush = useCallback(() => {
    frameRef.current = 0;

    const heard = heardRef.current;
    if (heard !== null) {
      heardRef.current = null;
      setLastHeard(heard);
      setLive(true);
      window.clearTimeout(liveTimerRef.current);
      liveTimerRef.current = window.setTimeout(() => setLive(false), LIVE_MS);
    }

    for (const action of queueRef.current.drain()) dispatchTimed(action);
  }, [dispatchTimed]);

  const schedule = useCallback(() => {
    if (frameRef.current !== 0) return;
    frameRef.current = requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => {
    const onBytes = (data: Uint8Array, timeStamp: number) => {
      const parsed = parseMidiMessage(data);
      if (!parsed) return;

      heardRef.current = `${parsed.kind} ch${parsed.channel + 1} n${parsed.data1}=${parsed.data2}`;

      const action = mapDdj400(parsed, ctxRef.current);
      if (action) {
        // O cronômetro guarda a última mensagem que virou ação, e não a
        // primeira, porque numa rajada de 14 bits o que interessa é o atraso
        // entre o byte final e a tela.
        probeRef.current.timeStamp = timeStamp;
        probeRef.current.mapEnd = performance.now();

        // A fila devolve o pendente antes da ação imediata, e por isso o laço
        // preserva a ordem do gesto em vez de deixar o botão furar a fila.
        for (const ready of queueRef.current.push(action)) dispatchTimed(ready);
      }

      schedule();
    };

    const unsubBytes = subscribeMidiBytes(onBytes);
    const unsubStatus = subscribeMidiStatus((next) => {
      setStatus(next.status);
      setDeviceName(next.deviceName);
      setPorts(next.ports);
      setError(next.error);
    });
    window.__mamuteMidiInject = injectMidiBytes;
    void startMidiSession();

    return () => {
      unsubBytes();
      unsubStatus();
      window.clearTimeout(liveTimerRef.current);
      if (frameRef.current !== 0) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [dispatchTimed, schedule]);

  const connect = useCallback(() => {
    void restartMidiSession();
  }, []);

  return { status, deviceName, ports, lastHeard, error, live, latency, connect, markPainted };
}

import { useCallback, useRef, useSyncExternalStore } from "react";
import { engine } from "./audio-engine";
import { notifyMixerSnapshotChange, subscribeMixerSnapshot } from "./mixer-snapshot-store";
import type { MixerSnapshot } from "../types/mixer";

/** Incrementa em cada HMR para descartar cache preservado pelo Fast Refresh. */
let selectorHmrEpoch = 0;

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    selectorHmrEpoch += 1;
    notifyMixerSnapshotChange();
  });
}

/**
 * Lê um recorte do snapshot do engine e só re-renderiza quando o selector muda.
 *
 * @param selector Projeta o snapshot vivo do engine no valor observado.
 * @param isEqual Compara o valor anterior com o novo; padrão é identidade referencial.
 */
export function useMixerSelector<T>(
  selector: (snapshot: MixerSnapshot) => T,
  isEqual: (previous: T, next: T) => boolean = Object.is,
): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const cacheRef = useRef<T | undefined>(undefined);
  const hmrEpochRef = useRef(selectorHmrEpoch);

  if (hmrEpochRef.current !== selectorHmrEpoch) {
    hmrEpochRef.current = selectorHmrEpoch;
    cacheRef.current = undefined;
  }

  const getSnapshot = useCallback(() => {
    const next = selectorRef.current(engine.snapshot);
    const cached = cacheRef.current;
    if (cached !== undefined && isEqual(cached, next)) {
      return cached;
    }
    cacheRef.current = next;
    return next;
  }, []);

  return useSyncExternalStore(subscribeMixerSnapshot, getSnapshot, getSnapshot);
}

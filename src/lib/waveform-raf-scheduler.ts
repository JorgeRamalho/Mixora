/** Taxa alvo de repaint compartilhado dos canvas de waveform no mixer. */
export const WAVEFORM_TARGET_FPS = 60;

/** Intervalo nominal de um frame a 60 fps, útil em testes e métricas. */
export const WAVEFORM_FRAME_INTERVAL_MS = 1000 / WAVEFORM_TARGET_FPS;

export type WaveformFrameCallback = () => void;

type FrameRequestCallback = (timestamp: number) => void;

type SchedulerDeps = {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (id: number) => void;
  now: () => number;
};

type WaveformRafScheduler = {
  /** Registra um repaint animado; retorna função de cleanup. */
  subscribe: (callback: WaveformFrameCallback) => () => void;
  /** Quantidade de listeners ativos (útil em testes). */
  listenerCount: () => number;
  /** Indica se o loop RAF está ativo (útil em testes). */
  isRunning: () => boolean;
  /** Reinicia estado interno (útil em testes). */
  reset: () => void;
};

const defaultDeps: SchedulerDeps = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
  now: () => performance.now(),
};

/**
 * Cria um scheduler único de RAF para vários canvas de waveform.
 * @param _fps Taxa nominal documentada; o vsync do browser limita o repaint real
 * @param deps Injeção de RAF e relógio para testes
 */
export function createWaveformRafScheduler(
  _fps = WAVEFORM_TARGET_FPS,
  deps: SchedulerDeps = defaultDeps,
): WaveformRafScheduler {
  const listeners = new Set<WaveformFrameCallback>();
  let rafId = 0;
  let running = false;

  /**
   * Pinta todos os listeners registrados num único lote.
   */
  function paintAll(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  /**
   * Tick do RAF compartilhado; pinta a cada vsync e deixa o display limitar a taxa.
   */
  function tick(): void {
    if (!running) return;
    paintAll();
    rafId = deps.requestFrame(tick);
  }

  /**
   * Inicia o loop RAF quando o primeiro listener entra.
   */
  function ensureRunning(): void {
    if (running) return;
    running = true;
    rafId = deps.requestFrame(tick);
  }

  /**
   * Encerra o loop RAF quando não há mais listeners.
   */
  function stopIfIdle(): void {
    if (listeners.size > 0) return;
    running = false;
    if (rafId !== 0) {
      deps.cancelFrame(rafId);
      rafId = 0;
    }
  }

  return {
    subscribe(callback) {
      listeners.add(callback);
      ensureRunning();
      return () => {
        listeners.delete(callback);
        stopIfIdle();
      };
    },

    listenerCount: () => listeners.size,

    isRunning: () => running,

    reset() {
      listeners.clear();
      stopIfIdle();
    },
  };
}

/** Scheduler compartilhado usado pelos quatro canvas de waveform do mixer. */
const waveformRafScheduler = createWaveformRafScheduler();

/**
 * Registra um canvas de waveform no scheduler compartilhado a 60 fps.
 * @param callback Função que repinta o canvas
 */
export function subscribeWaveformFrame(callback: WaveformFrameCallback): () => void {
  return waveformRafScheduler.subscribe(callback);
}

/** Reinicia o scheduler global (uso em testes). */
export function resetWaveformRafScheduler(): void {
  waveformRafScheduler.reset();
}

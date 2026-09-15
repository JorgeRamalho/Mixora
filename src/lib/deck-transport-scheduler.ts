import { engine } from "./audio-engine";

export type DeckTransportFrameCallback = () => void;

type FrameRequestCallback = (timestamp: number) => void;

type SchedulerDeps = {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (id: number) => void;
};

const defaultDeps: SchedulerDeps = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
};

const listeners = new Set<DeckTransportFrameCallback>();
let rafId = 0;
let running = false;

/**
 * Verifica se algum deck está em reprodução e precisa de espelho DOM contínuo.
 */
function anyDeckPlaying(): boolean {
  return engine.snapshot.a.playing || engine.snapshot.b.playing;
}

/**
 * Tick compartilhado do espelho de transporte dos CDJs.
 */
function tick(): void {
  if (!running) return;

  if (!anyDeckPlaying()) {
    running = false;
    if (rafId !== 0) {
      defaultDeps.cancelFrame(rafId);
      rafId = 0;
    }
    return;
  }

  rafId = defaultDeps.requestFrame(tick);
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Garante que o loop RAF compartilhado está ativo durante playback.
 */
function ensureRunning(): void {
  if (running || listeners.size === 0 || !anyDeckPlaying()) return;
  running = true;
  rafId = defaultDeps.requestFrame(tick);
}

/**
 * Registra um espelho de transporte no loop RAF compartilhado dos decks.
 * @param callback Função que atualiza relógio e fase no DOM
 */
export function subscribeDeckTransportFrame(callback: DeckTransportFrameCallback): () => void {
  listeners.add(callback);
  ensureRunning();
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && running) {
      running = false;
      if (rafId !== 0) {
        defaultDeps.cancelFrame(rafId);
        rafId = 0;
      }
    }
  };
}

/**
 * Reinicia o loop quando o transporte muda entre play e pause.
 * @param onPlayingChange Callback chamado em cada transição de playback
 */
export function bindDeckTransportPlayback(onPlayingChange: () => void): () => void {
  return engine.subscribePlaying(() => {
    onPlayingChange();
    ensureRunning();
  });
}

/** Reinicia o scheduler global (uso em testes). */
export function resetDeckTransportScheduler(): void {
  listeners.clear();
  running = false;
  if (rafId !== 0) {
    defaultDeps.cancelFrame(rafId);
    rafId = 0;
  }
}

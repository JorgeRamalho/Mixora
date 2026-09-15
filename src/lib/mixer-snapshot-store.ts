type MixerSnapshotListener = () => void;

const listeners = new Set<MixerSnapshotListener>();

/**
 * Inscreve callback para mudanças no snapshot do engine que exigem reconciliação React.
 *
 * @param listener Função chamada após cada refresh do reducer da cabine.
 * @returns Função para cancelar a inscrição.
 */
export function subscribeMixerSnapshot(listener: MixerSnapshotListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notifica inscritos de que o snapshot do engine mudou e o React deve reconsultar selectors.
 */
export function notifyMixerSnapshotChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

type CollectionDragListener = () => void;

let draggingTrackId: string | null = null;
const listeners = new Set<CollectionDragListener>();

/**
 * Id da faixa em arraste, ou null quando o ponteiro não carrega collection.
 */
export function getCollectionDragTrackId(): string | null {
  return draggingTrackId;
}

/**
 * Indica se um arraste da collection está ativo, para o jog recusar capture.
 */
export function isCollectionDragActive(): boolean {
  return draggingTrackId !== null;
}

/**
 * Inscreve a UI no início e no fim do arraste.
 *
 * @param listener Callback após mudar o trackId em voo.
 */
export function subscribeCollectionDrag(listener: CollectionDragListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Marca o início do arraste a partir de uma linha da collection.
 *
 * @param trackId Faixa que o ponteiro carrega até o deck.
 */
export function startCollectionDrag(trackId: string): void {
  draggingTrackId = trackId;
  for (const listener of listeners) listener();
}

/**
 * Encerra o arraste, com ou sem drop no deck.
 */
export function endCollectionDrag(): void {
  if (draggingTrackId === null) return;
  draggingTrackId = null;
  for (const listener of listeners) listener();
}

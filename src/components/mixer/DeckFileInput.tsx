import { forwardRef } from "react";
import type { DeckId } from "../../types/mixer";

/**
 * Input de arquivo escondido, um por deck. O React guarda a ref para o click
 * síncrono do botão LOAD preservar o gesto do usuário.
 *
 * @param props Deck e callback quando o aluno escolhe um arquivo.
 */
export const DeckFileInput = forwardRef<
  HTMLInputElement,
  {
    id: DeckId;
    onFile: (file: File) => void;
  }
>(function DeckFileInput({ id, onFile }, ref) {
  return (
    <input
      ref={ref}
      type="file"
      hidden
      accept="audio/*,.mp3,.wav,.flac,.aac,.m4a,.ogg"
      data-deck-file={id}
      tabIndex={-1}
      aria-label={`Arquivo deck ${id.toUpperCase()}`}
      onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (file) onFile(file);
      }}
    />
  );
});

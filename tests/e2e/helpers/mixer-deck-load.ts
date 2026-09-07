import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const MIXER_KICK_FIXTURE = path.resolve("tests/fixtures/mixer-kick-120bpm.wav");

/**
 * Envia o MP3 de fixture para o input escondido do deck e espera o decode.
 *
 * @param page Página em `/mixer`.
 * @param deck Deck destino.
 * @param filePath Caminho absoluto do arquivo. Padrão: kick 120 BPM.
 */
export async function uploadToDeck(
  page: Page,
  deck: "a" | "b",
  filePath = MIXER_KICK_FIXTURE,
): Promise<void> {
  const input = page.locator(`input[data-deck-file="${deck}"]`);
  await input.setInputFiles(filePath);
  await expect(page.locator(`.cdj-deck[data-deck='${deck}']`)).toHaveAttribute(
    "data-source-kind",
    "file",
    { timeout: 15_000 },
  );
}

import type { CamelotKey, CamelotLetter, HarmonyRelation } from "../types/harmony";

const HOUR_COLORS: Record<number, string> = {
  1: "#6b7cff",
  2: "#3d9dff",
  3: "#2ec8e8",
  4: "#2ad4b0",
  5: "#6ee05c",
  6: "#c6e64a",
  7: "#f0d24a",
  8: "#f5b04a",
  9: "#f07040",
  10: "#e8455a",
  11: "#e85a9a",
  12: "#9b6bff",
};

interface CamelotSeed {
  hour: number;
  letter: CamelotLetter;
  namePt: string;
  nameIntl: string;
  root: string;
  scale: string;
}

const CAMELOT_SEEDS: CamelotSeed[] = [
  { hour: 1, letter: "A", namePt: "Lá bemol menor", nameIntl: "Abm", root: "G#", scale: "Ab minor" },
  { hour: 1, letter: "B", namePt: "Si maior", nameIntl: "BM", root: "B", scale: "B major" },
  { hour: 2, letter: "A", namePt: "Mi bemol menor", nameIntl: "Ebm", root: "D#", scale: "Eb minor" },
  { hour: 2, letter: "B", namePt: "Fá sustenido maior", nameIntl: "F#M", root: "F#", scale: "Gb major" },
  { hour: 3, letter: "A", namePt: "Si bemol menor", nameIntl: "Bbm", root: "A#", scale: "Bb minor" },
  { hour: 3, letter: "B", namePt: "Ré bemol maior", nameIntl: "DbM", root: "C#", scale: "Db major" },
  { hour: 4, letter: "A", namePt: "Fá menor", nameIntl: "Fm", root: "F", scale: "F minor" },
  { hour: 4, letter: "B", namePt: "Lá bemol maior", nameIntl: "AbM", root: "G#", scale: "Ab major" },
  { hour: 5, letter: "A", namePt: "Dó menor", nameIntl: "Cm", root: "C", scale: "C minor" },
  { hour: 5, letter: "B", namePt: "Mi bemol maior", nameIntl: "EbM", root: "D#", scale: "Eb major" },
  { hour: 6, letter: "A", namePt: "Sol menor", nameIntl: "Gm", root: "G", scale: "G minor" },
  { hour: 6, letter: "B", namePt: "Si bemol maior", nameIntl: "BbM", root: "A#", scale: "Bb major" },
  { hour: 7, letter: "A", namePt: "Ré menor", nameIntl: "Dm", root: "D", scale: "D minor" },
  { hour: 7, letter: "B", namePt: "Fá maior", nameIntl: "FM", root: "F", scale: "F major" },
  { hour: 8, letter: "A", namePt: "Lá menor", nameIntl: "Am", root: "A", scale: "A minor" },
  { hour: 8, letter: "B", namePt: "Dó maior", nameIntl: "CM", root: "C", scale: "C major" },
  { hour: 9, letter: "A", namePt: "Mi menor", nameIntl: "Em", root: "E", scale: "E minor" },
  { hour: 9, letter: "B", namePt: "Sol maior", nameIntl: "GM", root: "G", scale: "G major" },
  { hour: 10, letter: "A", namePt: "Si menor", nameIntl: "Bm", root: "B", scale: "B minor" },
  { hour: 10, letter: "B", namePt: "Ré maior", nameIntl: "DM", root: "D", scale: "D major" },
  { hour: 11, letter: "A", namePt: "Fá sustenido menor", nameIntl: "F#m", root: "F#", scale: "Gb minor" },
  { hour: 11, letter: "B", namePt: "Lá maior", nameIntl: "AM", root: "A", scale: "A major" },
  { hour: 12, letter: "A", namePt: "Ré bemol menor", nameIntl: "Dbm", root: "C#", scale: "Db minor" },
  { hour: 12, letter: "B", namePt: "Mi maior", nameIntl: "EM", root: "E", scale: "E major" },
];

export const CAMELOT_CLOCKWISE_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export const CAMELOT_KEYS: CamelotKey[] = CAMELOT_SEEDS.map((seed) => ({
  ...seed,
  code: `${seed.hour}${seed.letter}`,
  mode: seed.letter === "A" ? "menor" : "maior",
  color: HOUR_COLORS[seed.hour] ?? "#8b7cff",
}));

export const CAMELOT_BY_CODE: Record<string, CamelotKey> = Object.fromEntries(
  CAMELOT_KEYS.map((key) => [key.code, key]),
);

export function wrapCamelotHour(hour: number): number {
  return ((((hour - 1) % 12) + 12) % 12) + 1;
}

export function parseCamelot(code: string): { hour: number; letter: CamelotLetter } | null {
  const match = /^(\d{1,2})([AB])$/i.exec(code.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  if (hour < 1 || hour > 12) return null;
  const letter = match[2]!.toUpperCase() as CamelotLetter;
  return { hour, letter };
}

export function getCamelotKey(code: string): CamelotKey | undefined {
  const parsed = parseCamelot(code);
  if (!parsed) return undefined;
  return CAMELOT_BY_CODE[`${parsed.hour}${parsed.letter}`];
}

/**
 * Normaliza um código Camelot para o formato canônico `8A`.
 *
 * @param code Tom vindo do deck, da API ou do browse.
 */
export function normalizeCamelotCode(code: string): string | null {
  const parsed = parseCamelot(code);
  if (!parsed) return null;
  return `${parsed.hour}${parsed.letter}`;
}

/**
 * Verifica se o tom da faixa coincide exatamente com o filtro Camelot.
 *
 * @param trackKey Tom da faixa na biblioteca.
 * @param filterCode Código Camelot escolhido na roda.
 */
export function matchesCamelotKey(trackKey: string | null | undefined, filterCode: string): boolean {
  return matchesCamelotFilter(trackKey, filterCode, "exact");
}

/**
 * Códigos Camelot compatíveis com mix harmônico: vizinhos, relativo e o próprio tom.
 *
 * @param code Tom de referência, por exemplo `8A`.
 */
export function compatibleCamelotCodes(code: string): string[] {
  const normalized = normalizeCamelotCode(code);
  if (!normalized) return [];
  const codes = new Set<string>([normalized]);
  const relative = relativeCamelot(normalized);
  const prev = neighborCamelot(normalized, -1);
  const next = neighborCamelot(normalized, 1);
  if (relative) codes.add(relative);
  if (prev) codes.add(prev);
  if (next) codes.add(next);
  return [...codes];
}

/**
 * Filtra faixas por tom Camelot no modo exato ou compatível.
 *
 * @param trackKey Tom da faixa na biblioteca.
 * @param filterCode Código escolhido na roda.
 * @param mode `exact` ou `compatible`, alinhado ao GET /api/tracks.
 */
export function matchesCamelotFilter(
  trackKey: string | null | undefined,
  filterCode: string,
  mode: "exact" | "compatible" = "exact",
): boolean {
  const filter = normalizeCamelotCode(filterCode);
  if (!filter || !trackKey) return false;
  const track = normalizeCamelotCode(trackKey);
  if (!track) return false;
  if (mode === "exact") return track === filter;
  return compatibleCamelotCodes(filter).includes(track);
}

export function otherCamelotLetter(letter: CamelotLetter): CamelotLetter {
  return letter === "A" ? "B" : "A";
}

export function relativeCamelot(code: string): string | null {
  const parsed = parseCamelot(code);
  if (!parsed) return null;
  return `${parsed.hour}${otherCamelotLetter(parsed.letter)}`;
}

export function neighborCamelot(code: string, delta: number): string | null {
  const parsed = parseCamelot(code);
  if (!parsed) return null;
  return `${wrapCamelotHour(parsed.hour + delta)}${parsed.letter}`;
}

export function harmonicSquare(code: string): string[] {
  const parsed = parseCamelot(code);
  if (!parsed) return [];
  const other = otherCamelotLetter(parsed.letter);
  const next = wrapCamelotHour(parsed.hour + 1);
  return [
    `${parsed.hour}${parsed.letter}`,
    `${parsed.hour}${other}`,
    `${next}${other}`,
    `${next}${parsed.letter}`,
  ];
}

export function camelotRelation(from: string, to: string): HarmonyRelation {
  if (from.toUpperCase() === to.toUpperCase()) return "perfect";
  const start = parseCamelot(from);
  const end = parseCamelot(to);
  if (!start || !end) return "shift";
  if (start.hour === end.hour && start.letter !== end.letter) return "relative";
  const diff = Math.abs(start.hour - end.hour);
  const adjacent = diff === 1 || diff === 11;
  if (adjacent && start.letter === end.letter) return "neighbor";
  if (adjacent && start.letter !== end.letter) return "diagonal";
  return "shift";
}

export function relationLabel(relation: HarmonyRelation): string {
  switch (relation) {
    case "perfect":
      return "Mesmo tom";
    case "relative":
      return "Relativo";
    case "neighbor":
      return "Vizinho";
    case "diagonal":
      return "Diagonal";
    case "shift":
      return "Tensão";
    default: {
      const _never: never = relation;
      return _never;
    }
  }
}

export function resolveMusicalKey(camelot: string): { root: string; scale: string; label: string } {
  const entry = getCamelotKey(camelot);
  if (!entry) {
    return { root: "—", scale: "Unknown", label: camelot };
  }
  return {
    root: entry.root,
    scale: entry.scale,
    label: `${entry.root} · ${entry.scale}`,
  };
}

export function harmonicDistance(from: string, to: string): "perfect" | "compatible" | "shift" {
  const relation = camelotRelation(from, to);
  switch (relation) {
    case "perfect":
      return "perfect";
    case "relative":
    case "neighbor":
    case "diagonal":
      return "compatible";
    case "shift":
      return "shift";
    default: {
      const _never: never = relation;
      return _never;
    }
  }
}

export type CamelotLetter = "A" | "B";

export type HarmonyRelation = "perfect" | "relative" | "neighbor" | "diagonal" | "shift";

export type HarmonyStudyId = "ler" | "aplicar" | "metodos" | "praticas";

export interface CamelotKey {
  code: string;
  hour: number;
  letter: CamelotLetter;
  mode: "menor" | "maior";
  namePt: string;
  nameIntl: string;
  root: string;
  scale: string;
  color: string;
}

export interface HarmonyStudy {
  id: HarmonyStudyId;
  title: string;
  kicker: string;
  lead: string;
  steps?: string[];
  cards?: { title: string; body: string }[];
  bullets?: string[];
}

export interface HarmonyTip {
  id: string;
  title: string;
  body: string;
}

export interface HarmonyDrill {
  id: string;
  title: string;
  goal: string;
  duration: string;
  steps: string[];
}

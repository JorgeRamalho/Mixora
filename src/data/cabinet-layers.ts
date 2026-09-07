export type CabinetLayerId = "mixer" | "academy";

export type CabinetLayer = {
  id: CabinetLayerId;
  index: string;
  title: string;
  tagline: string;
  body: string;
  accent: string;
  glyph: string;
  route: string;
  cta: string;
};

export const CABINET_LAYERS: CabinetLayer[] = [
  {
    id: "mixer",
    index: "01",
    title: "Simulador CDJ / controladora",
    tagline: "Motor dual deck",
    body:
      "Dois decks, jog, pitch, EQ de 3 bandas, waveform e crossfader com curva equal-power. O áudio nasce no Web Audio API — loops sintéticos para treinar sem infringir termos.",
    accent: "#3ee8d6",
    glyph: "A·B",
    route: "/mixer",
    cta: "Abrir mixer",
  },
  {
    id: "academy",
    index: "02",
    title: "Academia iniciante → conclusão",
    tagline: "Progresso no visor",
    body:
      "Aulas em vídeo, dicas de cabine e exercícios cronometrados. O progresso fica no visor até você fechar o checklist da booth.",
    accent: "#8b7cff",
    glyph: "▶",
    route: "/academia",
    cta: "Entrar na sala",
  },
];

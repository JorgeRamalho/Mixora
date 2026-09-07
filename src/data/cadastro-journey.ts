/** Jornada sequencial do Cadastro completo de cabine — 8 etapas + boas-vindas. */

export const CADASTRO_STEPS = [
  {
    step: 1,
    id: "dj-section-1",
    short: "Identidade",
    title: "Identidade",
    hint: "Quem você é fora e dentro da cabine.",
    skippable: false,
  },
  {
    step: 2,
    id: "dj-section-2",
    short: "Contato",
    title: "Contato",
    hint: "Canal direto para booking e mentoria.",
    skippable: false,
  },
  {
    step: 3,
    id: "dj-section-3",
    short: "Perfil",
    title: "Perfil artístico",
    hint: "Gêneros, nível e a história do seu som.",
    skippable: false,
  },
  {
    step: 4,
    id: "dj-section-4",
    short: "Equip.",
    title: "Equipamento",
    hint: "CDJ, controladora, mixer ou vinil — o MIXORAPlayerDJ simula os três primeiros.",
    skippable: true,
  },
  {
    step: 5,
    id: "dj-section-5",
    short: "Redes",
    title: "Presença digital",
    hint: "Handles do MIXORA e das cinco integrações do visor — preencha os que você usa.",
    skippable: true,
  },
  {
    step: 6,
    id: "dj-section-6",
    short: "Carreira",
    title: "Carreira",
    hint: "Booking, selos e disponibilidade para gigs.",
    skippable: true,
  },
  {
    step: 7,
    id: "dj-section-7",
    short: "Academy",
    title: "Aprendizado",
    hint: "A academia usa isso para sugerir módulos e exercícios.",
    skippable: true,
  },
  {
    step: 8,
    id: "dj-section-8",
    short: "Termos",
    title: "Termos",
    hint: "Cadastro pedagógico. Mixagem licenciada continua nas plataformas oficiais.",
    skippable: false,
  },
] as const;

export const CADASTRO_STEP_COUNT = CADASTRO_STEPS.length;

export type CadastroStepNumber = (typeof CADASTRO_STEPS)[number]["step"];

export function isCadastroStep(value: number): value is CadastroStepNumber {
  return Number.isInteger(value) && value >= 1 && value <= CADASTRO_STEP_COUNT;
}

export function cadastroJourneyProgress(step: CadastroStepNumber, completed: boolean): number {
  if (completed) return 100;
  return Math.round(((step - 1) / CADASTRO_STEP_COUNT) * 100);
}

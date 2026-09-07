import type { BoothFaqTopic, CompareRow, Plan, PlanFaq, PlanId } from "../types/plan";

export const PLANS: Plan[] = [
  {
    id: "bronze",
    name: "Bronze",
    badge: "Primeiro beat",
    tagline: "Cabine de casa para quem está aprendendo a contar o grid.",
    audience: "Iniciante · treino no browser",
    monthly: 29,
    yearly: 290,
    featured: false,
    cta: "Assinar Bronze",
    includes: [
      "Mixer dual deck com play, jog, pitch, EQ de 3 bandas e crossfader",
      "Academia: módulo Fundação (aulas, dicas e checklist do visor)",
      "Fichas públicas de Beatport, Deezer, SoundCloud, YouTube e Spotify",
      "1 perfil de DJ gravado no visor (localStorage)",
      "Progresso das aulas no próprio dispositivo",
    ],
    perks: [
      "Entra na cabine no mesmo dia, sem hardware",
      "Ideal para o primeiro beatmatch de fone",
      "Cancela no fim do ciclo, sem multa pedagógica",
    ],
  },
  {
    id: "prata",
    name: "Prata",
    badge: "Alto Nível",
    tagline: "Do warm-up à conclusão da academia, com waveform, cue e fila de treino.",
    audience: "Intermediário · prática diária",
    monthly: 59,
    yearly: 590,
    featured: true,
    cta: "Assinar Prata",
    includes: [
      "Tudo do Bronze, com waveform, cue e hot cues sintéticos",
      "Academia completa: iniciante → intermediário → avançado → conclusão",
      "Exercícios cronometrados (metrônomo vivo, duplo kick, curva de energia)",
      "Até 3 perfis de cabine no mesmo dispositivo",
      "Dicas semanais no feed e newsletter de booth",
    ],
    perks: [
      "O combo que cobre treino e aula sem pular etapa",
      "Dois meses de desconto no ciclo anual (10× o mensal)",
      "Hábitos de metadados antes de pisar num CDJ de clube",
    ],
  },
  {
    id: "ouro",
    name: "Ouro",
    badge: "Booth avançada",
    tagline: "Cabine completa para quem já fecha a noite e quer mentoria no visor.",
    audience: "Avançado · residência pedagógica",
    monthly: 99,
    yearly: 990,
    featured: false,
    cta: "Assinar Ouro",
    includes: [
      "Tudo da Prata, com presets de curva equal-power e sessão de overlap",
      "Mentoria marcada no cadastro (flag de acompanhamento)",
      "Exportação dos campos de press kit e relatório de prática no visor",
      "Fila prioritária de exercícios e dicas de peak time",
      "Até 5 perfis / booths e 3 visores ativos",
      "Canal DJ com resposta em 12 horas úteis",
    ],
    perks: [
      "Para quem já conta 32 beats e quer fechar o checklist da booth",
      "Press kit e residências entram no mesmo cadastro de oito seções",
      "Prioridade no roteiro de features da cabine MIXORA",
    ],
  },
];

export const PLAN_COMPARE: CompareRow[] = [
  { group: "Mixer", feature: "Waveform + hot cues", values: { bronze: false, prata: true, ouro: true } },
  { group: "Mixer", feature: "Curva XF avançada", values: { bronze: false, prata: false, ouro: true } },
  { group: "Academia", feature: "Trilha + exercícios", values: { bronze: false, prata: true, ouro: true } },
  { group: "Academia", feature: "Mentoria booth", values: { bronze: false, prata: false, ouro: true } },
  { group: "Conta", feature: "Perfis · visores", values: { bronze: "1 · 1", prata: "3 · 2", ouro: "5 · 3" } },
  { group: "Conta", feature: "Export press kit", values: { bronze: false, prata: false, ouro: true } },
  { group: "Suporte", feature: "Resposta SLA", values: { bronze: "72 h", prata: "48 h", ouro: "12 h" } },
];

export const PLAN_FAQS: PlanFaq[] = [
  {
    id: "streaming-audio",
    topic: "mixer",
    question: "O áudio do mixer é de Spotify, Beatport ou Deezer?",
    answer:
      "Não. O simulador CDJ usa loops sintéticos no Web Audio API. Spotify proíbe mix e crossfade; Beatport LINK é parceria gated. Os combos cobrem treino e academia — não um LINK pirata.",
    takeaways: [
      "Treine beatmatch e EQ com o motor MIXORA antes de depender de catálogo externo.",
      "Use o catálogo do site para entender limites legais de cada plataforma.",
      "Bronze já cobre play, jog, pitch e crossfader — suficiente para o primeiro grid.",
    ],
    route: "/mixer",
    routeLabel: "Abrir mixer CDJ",
  },
  {
    id: "escolher-combo",
    topic: "assinatura",
    question: "Por onde começo — Bronze, Prata ou Ouro?",
    answer:
      "Bronze fecha o primeiro beatmatch de fone. Prata libera academia completa, waveform e cue — é o combo mais escolhido. Ouro entra quando você já fecha checklist de booth e quer mentoria, export de press kit e mais perfis.",
    takeaways: [
      "Iniciante no grid → Bronze; quer trilha + exercícios → Prata.",
      "Compare só o essencial na tabela acima antes de decidir.",
      "Upgrade no próximo ciclo; progresso e perfil ficam no mesmo visor.",
    ],
    route: "/cadastro",
    routeLabel: "Cadastro de cabine",
  },
  {
    id: "upgrade-combo",
    topic: "assinatura",
    question: "Posso mudar de Bronze para Prata ou Ouro depois?",
    answer:
      "Sim. O upgrade vale no próximo ciclo. O progresso da academia e o perfil do visor continuam no mesmo dispositivo; o combo novo só destrava módulos e limites de booth.",
    takeaways: [
      "Não perde aulas concluídas ao subir de combo.",
      "Anual congela preço — vale se já sabe que ficará na Prata ou Ouro.",
      "Downgrade também no fim do ciclo, sem multa pedagógica.",
    ],
  },
  {
    id: "ciclo-anual",
    topic: "assinatura",
    question: "O ciclo anual trava o cancelamento?",
    answer:
      "O anual antecipa 10 meses e congela o preço. Você pode deixar de renovar no fim do período. O mensal cancela no encerramento do mês vigente, sem multa pedagógica.",
    takeaways: [
      "Anual = 2 meses inclusos (10× o mensal).",
      "Ideal quando a academia vira rotina semanal.",
      "Toggle Mensal / Anual no topo desta seção simula o valor antes do cadastro.",
    ],
  },
  {
    id: "trilha-academia",
    topic: "academia",
    question: "O que a academia cobre sem CDJ física?",
    answer:
      "Anatomia da CDJ, contagem de 32 beats, ganho/cue/booth, sync, codec de tracks e checklist de booth — com vídeos, dicas e exercícios cronometrados. Bronze libera Fundação; Prata e Ouro abrem a trilha completa até conclusão.",
    takeaways: [
      "Progresso fica no visor (localStorage) até você concluir o módulo.",
      "Exercícios usam metrônomo vivo e loops sintéticos — sem violar termos de streaming.",
      "Leitura recomendada e material de apoio ficam fora do fieldset da aula, como seções próprias.",
    ],
    route: "/academia",
    routeLabel: "Entrar na academia",
  },
  {
    id: "hardware-cdj",
    topic: "mixer",
    question: "Preciso de CDJ física para assinar?",
    answer:
      "Não. A cabine MIXORAPlayerDJ roda no browser. Hardware real (CDJ, controladora, mixer, toca-discos) entra só no cadastro, para o visor saber com o que você treina na vida real.",
    takeaways: [
      "Simulador dual deck cobre jog, pitch, EQ e crossfader equal-power.",
      "Cadastro de 8 seções registra equipamento, press kit e residências.",
      "Quando tiver hardware, os hábitos de cue e trim já vêm da academia.",
    ],
    route: "/cadastro",
    routeLabel: "Formulário de cabine",
  },
  {
    id: "catalogo-vs-mixer",
    topic: "integracoes",
    question: "Catálogo de plataformas vs player MIXORA — qual a diferença?",
    answer:
      "O visor HUD lista MIXORA, Beatport, SoundCloud, Deezer, Spotify e YouTube com o que entra e o que cada termo bloqueia. O player nativo é o MIXORA: mix pedagógico no browser. As demais são intel de integração — descoberta e limites publicados, não áudio de clube.",
    takeaways: [
      "MIXORA = motor de treino; fichas = transparência legal por plataforma.",
      "Carrossel da home gira as seis integrações com painel de capacidades.",
      "Nenhum combo promete Beatport LINK ou mix de biblioteca Spotify.",
    ],
    route: "/catalogo",
    routeLabel: "Ver plataformas",
  },
  {
    id: "pagamento",
    topic: "conta",
    question: "Onde o pagamento é confirmado?",
    answer:
      "Esta página escolhe o combo e leva ao cadastro de cabine. A cobrança entra no checkout da conta MIXORAPlayerDJ depois do perfil gravado — o visor não processa cartão nesta tela.",
    takeaways: [
      "Fluxo: combo → cadastro DJ → checkout da conta MIXORA.",
      "Perfis Bronze (1), Prata (3) e Ouro (5) ficam no dispositivo até sync futuro.",
      "Suporte: 72 h Bronze · 48 h Prata · 12 h Ouro — conforme comparativo.",
    ],
    route: "/cadastro",
    routeLabel: "Escolher combo no cadastro",
  },
];

export const BOOTH_FAQ_TOPIC_LABEL: Record<BoothFaqTopic, string> = {
  assinatura: "Assinatura",
  mixer: "Mixer CDJ",
  academia: "Academia",
  integracoes: "Integrações",
  conta: "Conta & visor",
};

export const PLAN_NOTES = [
  "Preços em reais, sem taxas de plataforma de streaming de terceiros.",
  "Dois meses inclusos no anual (10× o valor mensal).",
  "MIXORAPlayerDJ não substitui licenças oficiais de Beatport, Spotify, Deezer, SoundCloud ou YouTube.",
];

export const PLAN_NAMES: Record<PlanId, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
};

export function isPlanId(value: string | null): value is PlanId {
  return value === "bronze" || value === "prata" || value === "ouro";
}

import type { Exercise, TipCard } from "../types";

export const TIPS: TipCard[] = [
  {
    id: "tip-01",
    title: "Ouça o kick, não o waveform",
    body: "O visor ajuda, mas o beatmatch de verdade acontece no fone. Feche um olho no BPM e treine 10 minutos por dia só com o ouvido.",
    level: "iniciante",
  },
  {
    id: "tip-02",
    title: "Um grave por vez",
    body: "Dois kicks somados empastam o PA. Corte o low do deck que entra até o crossfader cruzar o centro.",
    level: "iniciante",
  },
  {
    id: "tip-03",
    title: "Frase de 32 é lei no house",
    body: "Trocas no meio da frase quebram o corpo da pista. Conte 8-8-8-8 e só então abra o fader.",
    level: "intermediario",
  },
  {
    id: "tip-04",
    title: "Sync é treino, não muleta",
    body: "Use sync para estudar harmonia e seleção. Desligue para treinar pitch e jog — é o que te salva numa CDJ de clube.",
    level: "intermediario",
  },
  {
    id: "tip-05",
    title: "Energia sobe em degraus",
    body: "Não gaste o ID mais pesado aos 20 minutos. Construa 4 blocos: warm, cruise, peak, afterglow.",
    level: "avancado",
  },
  {
    id: "tip-06",
    title: "Catálogos não são decks de mix",
    body: "Spotify e Deezer no MIXORAPlayerDJ são descoberta. Mixagem pedagógica roda no motor interno. Beatport LINK é o caminho profissional.",
    level: "conclusao",
  },
];

export const EXERCISES: Exercise[] = [
  {
    id: "ex-01",
    title: "Metrônomo vivo",
    goal: "Manter o kick do Deck A colado no grid por 2 minutos.",
    duration: "8 min",
    steps: [
      "Abra o mixer MIXORA e dê play no Deck A",
      "Feche o fone no cue A e conte 1-2-3-4 em voz alta",
      "Nudge o jog 4 vezes para frente e 4 para trás sem perder o 1",
    ],
  },
  {
    id: "ex-02",
    title: "Duplo kick controlado",
    goal: "Beatmatch A e B e cruzar o fader em 32 beats.",
    duration: "12 min",
    steps: [
      "Ajuste o pitch do Deck B até o BPM coincidir",
      "Alinhe os kicks com o jog",
      "Corte o low de B, abra o fader em 32 beats, devolva o EQ",
    ],
  },
  {
    id: "ex-03",
    title: "Curva de energia",
    goal: "Montar um bloco de 4 faixas com BPM crescente de 2 em 2.",
    duration: "20 min",
    steps: [
      "Escolha 4 faixas no mixer com BPM distinto",
      "Anote a key de cada um no caderno do visor",
      "Toque só as intros no mixer e desenhe o arco no papel",
    ],
  },
  {
    id: "ex-04",
    title: "Booth imaginário",
    goal: "Simular troca de DJ: 2 minutos de overlap educado.",
    duration: "10 min",
    steps: [
      "Deck A toca o set que 'já está no ar'",
      "Deck B prepara a primeira faixa do próximo DJ",
      "Faça a passagem no downbeat e cumprimente a pista no visor",
    ],
  },
];

export const GENRE_OPTIONS = [
  "House",
  "Techno",
  "Trance",
  "Drum & Bass",
  "Dubstep",
  "Disco / Nu-Disco",
  "Afro House",
  "Melodic",
  "Hard Groove",
  "Open Format",
] as const;

export const SOFTWARE_OPTIONS = [
  "rekordbox",
  "Serato DJ",
  "Traktor",
  "VirtualDJ",
  "djay Pro",
  "Engine DJ",
  "MIXORAPlayerDJ Mixer",
] as const;

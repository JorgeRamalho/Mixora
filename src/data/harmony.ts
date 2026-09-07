import type { HarmonyDrill, HarmonyStudy, HarmonyTip } from "../types/harmony";

export const HARMONY_STUDIES: HarmonyStudy[] = [
  {
    id: "ler",
    title: "Como ler a roda",
    kicker: "Fundação · relógio de tons",
    lead: "A roda Camelot é o círculo de quintas desenhado como um relógio. Você não precisa saber teoria para navegar em boa sintonia — precisa saber ler o código no visor.",
    bullets: [
      "Doze horas. Cada fatia é um tom. 8 no relógio não é oitava: é o bairro de Dó maior / Lá menor.",
      "Anel de fora, letra B: tons maiores. Anel de dentro, letra A: tons menores.",
      "Mesmo número, letras diferentes = relativos. 8A Lá menor e 8B Dó maior compartilham as mesmas notas.",
      "Andar uma hora no mesmo anel = subir ou descer uma quinta. É o caminho mais limpo.",
      "Mixed in Key, rekordbox, Serato e o visor MIXORA usam esse código. Se a key no arquivo estiver errada, a roda mente.",
    ],
  },
  {
    id: "aplicar",
    title: "Como aplicar no set",
    kicker: "Método · da crate à frase",
    lead: "Harmonia não substitui phrasing nem energia. Ela só diz quais faixas não vão brigar de tom enquanto você constrói o arco.",
    steps: [
      "Leia a key no visor ou nos metadados — 8A, não “acho que é menor”.",
      "Marque o bairro: o próprio código, os dois vizinhos (±1) e o relativo (mesma hora, outra letra).",
      "Monte um bloco de 4 faixas nesse quadrado antes de subir. Não improvise a crate na hora.",
      "Transicione na frase de 32. Tom certo no meio da frase ainda quebra o corpo da pista.",
      "Corte o grave do deck que entra até o kick ficar único. Dois tons vizinhos com dois kicks empastam igual.",
      "Avance um passo por mix. Só então gire a roda. Encadear três saltos seguidos tira o chão.",
    ],
  },
  {
    id: "metodos",
    title: "Métodos de navegação",
    kicker: "Mapa · quatro caminhos",
    lead: "Quatro jeitos de viajar. O iniciante fica no bairro. O avançado escolhe o caminho conforme a pista, não conforme o ego.",
    cards: [
      {
        title: "Vizinhança segura",
        body: "Mesmo código, ±1 na mesma letra, ou o relativo. 8A → 7A, 9A ou 8B. É o GPS do primeiro ano de cabine.",
      },
      {
        title: "Boost relativo",
        body: "Menor para o maior da mesma hora (8A → 8B) abre o céu. O inverso (8B → 8A) fecha o corpo. Use o boost no peak, o fechamento no afterglow.",
      },
      {
        title: "Viagem no relógio",
        body: "Horário = sobe quintas, constrói tensão. Anti-horário = resolve, mais introspectivo. Fique 15–20 min no mesmo bairro antes de mudar de hemisfério.",
      },
      {
        title: "Quadrado harmônico",
        body: "8A → 8B → 9B → 9A fecha um laço. Quatro faixas, um arco, volta para casa. É o exercício-base desta seção.",
      },
      {
        title: "Diagonal (avançado)",
        body: "8A → 9B ou 8A → 7B. Muda modo e quinta ao mesmo tempo. Funciona em instrumental; vocais brigam. Ensaie no mixer antes da pista.",
      },
      {
        title: "Energia manda",
        body: "Se a pista pede peak e a próxima harmônica é um pad lento, a harmonia perde. Key é filtro, não ditador. BPM ±4 e energia primeiro.",
      },
    ],
  },
  {
    id: "praticas",
    title: "Boas práticas",
    kicker: "Booth · o que segura o PA",
    lead: "A roda não ouve o PA por você. Estas regras evitam o mix “certo no papel” que soa sujo na caixa.",
    bullets: [
      "Vocais: só mesmo tom ou relativo. Duas vozes em diagonal gritam uma na outra.",
      "Instrumental, perc e breakdown aguentam mais tensão do que um acapella.",
      "Não misture só por número. Gênero, BPM e energia ainda decidem se a faixa entra.",
      "Dois graves em tons vizinhos ainda empastam. EQ de low continua lei.",
      "Grave a jornada no caderno do visor: 8A → 8B → 9B. Memória de set é treino, não talento.",
      "Quebre a regra uma vez por bloco, no drop, de propósito — nunca por descuido.",
      "Key errada no arquivo é pior do que key vazia. Confira no visor MIXORA antes de gravar o USB.",
      "Sync ajuda a estudar harmonia. Não use sync para pular o ouvido no beatmatch.",
    ],
  },
];

export const HARMONY_TIPS: HarmonyTip[] = [
  {
    id: "ht-01",
    title: "Comece em 8A",
    body: "Lá menor é o porto do house. Quase toda crate iniciante vive entre 7A, 8A, 9A e 8B. Domine esse bairro antes de cruzar o relógio.",
  },
  {
    id: "ht-02",
    title: "Um passo por mix",
    body: "Se você pulou de 8A para 11B, a pista sente. Trate a roda como rua de mão única: vizinho, relativo, depois o próximo quadrado.",
  },
  {
    id: "ht-03",
    title: "Relativo no peak",
    body: "Quando a energia precisa subir sem mudar o BPM, troque A por B no mesmo número. O ânimo abre e a harmonia continua limpa.",
  },
  {
    id: "ht-04",
    title: "Vocal trava o tom",
    body: "Faixa com canto pede vizinhança estrita. Sem vocal, a diagonal vira ferramenta. Ouvinte leigo percebe voz desafinada; perc passa.",
  },
  {
    id: "ht-05",
    title: "Key é filtro, não set",
    body: "Uma crate só de 8A vira monótona. Alterne bairros a cada bloco de 15 minutos e deixe um contraste preparado para o drop.",
  },
  {
    id: "ht-06",
    title: "Ouça o terceiro acorde",
    body: "A intro pode ser neutra e o drop brigar. Pré-escute 32 beats depois do cue, não só o começo, antes de declarar “compatível”.",
  },
];

export const HARMONY_DRILLS: HarmonyDrill[] = [
  {
    id: "hd-01",
    title: "Bairro de três códigos",
    goal: "Sair de um tom e voltar só pelos vizinhos, sem olhar a waveform.",
    duration: "10 min",
    steps: [
      "Toque a fatia na roda e anote o código, o relativo e os dois vizinhos",
      "No mixer, carregue três loops de treino nesses códigos",
      "Cruze o fader em 32 beats em cada passagem, grave baixo do deck que entra",
    ],
  },
  {
    id: "hd-02",
    title: "Quadrado harmônico",
    goal: "Fechar 8A → 8B → 9B → 9A (ou o quadrado do tom escolhido) sem quebrar a frase.",
    duration: "16 min",
    steps: [
      "Clique um código na roda e copie a jornada sugerida",
      "Monte as quatro faixas na crate do visor",
      "Toque o laço duas vezes: uma com sync para ouvir só o tom, outra no jog",
    ],
  },
  {
    id: "hd-03",
    title: "Boost e afterglow",
    goal: "Usar o relativo maior para o peak e o menor para desacelerar.",
    duration: "12 min",
    steps: [
      "Comece em um A (menor) e suba para o B da mesma hora no drop",
      "Segure 32 beats no maior",
      "Volte para um vizinho menor e feche o bloco como afterglow",
    ],
  },
  {
    id: "hd-04",
    title: "Quebra controlada",
    goal: "Fazer um único salto de tensão e voltar para o bairro em duas mixagens.",
    duration: "14 min",
    steps: [
      "Escolha um código e um salto diagonal (ex.: 8A → 9B)",
      "Faça o salto no drop, com perc ou instrumental",
      "Na faixa seguinte, volte a um vizinho do código original",
    ],
  },
];

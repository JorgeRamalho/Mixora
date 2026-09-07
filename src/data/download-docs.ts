import { BRAND } from "./brand";
import { DOWNLOAD_VERSION } from "./downloads";
import type { DownloadDoc, DownloadDocId } from "../types";

export const DOWNLOAD_DOCS: readonly DownloadDoc[] = [
  {
    id: "mixer",
    title: "Mixer CDJ",
    mode: "Modo equipamento · cabine profissional",
    route: "/mixer",
    accent: "#3ee8d6",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-doc-mixer-cdj.txt`,
    summary:
      "Dual CDJ + mixer integrado: jog, pitch, EQ de 3 bandas, waveform, cue, hot cues, crossfader equal-power e LOAD MP3 em cada deck.",
    audience: "Cabine de treino e booth pedagógica",
    sections: [
      {
        heading: "O que é este modo",
        body: [
          "O Mixer CDJ é o modo equipamento da cabine MIXORA. Dois decks A/B, consola central e o mesmo vocabulário de uma CDJ Pioneer de clube.",
          "O áudio de treino nasce no MIXORA Engine (Web Audio API): loops sintéticos até você carregar um MP3. Não é Beatport LINK, rekordbox nem Serato.",
        ],
      },
      {
        heading: "Como operar",
        body: [
          "Abra Mixer CDJ no header.",
          "Dê play no Deck A. Use jog para nudge, pitch para BPM, cue para o ponto de entrada.",
          "EQ HIGH / MED / LOW e kill por banda. Corte o grave do deck que entra até o kick ficar único.",
          "O crossfader usa curva equal-power. Cruze no centro só na frase de 32 beats.",
          "LOAD MP3 em cada deck para treinar com arquivo real. Sem arquivo, o loop sintético segue no grid.",
        ],
      },
      {
        heading: "Limites profissionais",
        body: [
          "Spotify e Deezer não entram no mixer: os termos proíbem mix e crossfade.",
          "O MIXORAPlayerDJ é pedagógico. Palco real ainda pede hardware, licença e horas de booth.",
        ],
      },
    ],
  },
  {
    id: "dj-online",
    title: "DJ ONLINE",
    mode: "Modo harmônico · MASTER/SYNC",
    route: "/mixer",
    accent: "#8ff5ea",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-doc-dj-online.txt`,
    summary:
      "IA Camelot no mixer: escolhe MASTER na passagem, alinha SYNC no outro deck e mostra se as keys são vizinhança, relativo ou salto.",
    audience: "Passagem A/B com harmonia no visor",
    sections: [
      {
        heading: "O que é este modo",
        body: [
          "DJ ONLINE vive dentro do Mixer CDJ. Liga o plano de harmonia Camelot + MASTER/SYNC na passagem entre os decks.",
          "O MASTER segue o lado do crossfader (A à esquerda, B à direita) ou o deck que está tocando. O outro deck vira SYNC.",
        ],
      },
      {
        heading: "Como operar",
        body: [
          "Carregue faixas (ou loops) nos dois decks e leia BPM e key no visor.",
          "Arme DJ ONLINE no mixer. O plano mostra relação (vizinhança, relativo, quadrado ou salto) e o caminho melódico.",
          "Use MASTER no deck da pista e SYNC no que entra só para estudar harmonia. Desligue o sync para treinar pitch e jog.",
          "A passagem continua sua: EQ, fader e frase de 32 não são automáticos.",
        ],
      },
      {
        heading: "Limites profissionais",
        body: [
          "Key errada no arquivo faz o plano mentir. Confira o código Camelot no visor antes de gravar o set.",
          "DJ ONLINE não mixa por você e não substitui o ouvido no fone.",
        ],
      },
    ],
  },
  {
    id: "harmonia",
    title: "Harmonia Camelot",
    mode: "Modo harmônico · roda profissional",
    route: "/harmonia",
    accent: "#e85aa8",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-doc-harmonia.txt`,
    summary:
      "Roda Camelot em relógio: anel B (maior), anel A (menor), vizinhos, relativo, quadrado harmônico e drills de cabine.",
    audience: "Seleção e navegação de tons no set",
    sections: [
      {
        heading: "O que é este modo",
        body: [
          "A escala Camelot traduz o círculo de quintas em relógio. Mixed in Key, rekordbox, Serato e o visor MIXORA usam o mesmo código (8A, 8B…).",
          "Clique uma fatia: os vizinhos acendem. Abaixo estão leitura da roda, aplicação no set, métodos e boas práticas.",
        ],
      },
      {
        heading: "Como operar",
        body: [
          "Abra Harmonia. Escolha o código da faixa no visor (ex.: 8A).",
          "Bairro seguro: mesmo código, ±1 na mesma letra, ou o relativo (8A → 8B).",
          "Monte um bloco de 4 faixas no quadrado (8A → 8B → 9B → 9A) antes de subir.",
          "Transicione na frase de 32. Tom certo no meio da frase ainda quebra o corpo da pista.",
          "Energia e BPM mandam: harmonia é filtro, não ditador.",
        ],
      },
      {
        heading: "Limites profissionais",
        body: [
          "Vocais: só mesmo tom ou relativo. Diagonal em acapella grita.",
          "Dois graves em tons vizinhos ainda empastam. EQ de low continua lei.",
        ],
      },
    ],
  },
  {
    id: "academia",
    title: "Academia MIXORA",
    mode: "Modo formação · iniciante à conclusão",
    route: "/academia",
    accent: "#9b7dff",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-doc-academia.txt`,
    summary:
      "Quatro módulos, doze aulas, dicas e laboratório. Checklist no visor e diploma pedagógico MIXORAPlayerDJ.",
    audience: "Trilha de cabine com progresso no dispositivo",
    sections: [
      {
        heading: "O que é este modo",
        body: [
          "A Academia MIXORA forma do primeiro beat à conclusão de cabine: anatomia da CDJ, contar 32 beats, ganho, cue de fone, harmonia e energia.",
          "O progresso fica no visor (localStorage) até você fechar o checklist. O diploma é pedagógico — o palco real ainda pede horas de booth.",
        ],
      },
      {
        heading: "Como operar",
        body: [
          "Abra Sala de Aula. Siga os módulos na ordem: Fundação → prática → avançado → conclusão.",
          "Assista a aula, leia as referências oficiais e marque cada item do checklist.",
          "Use o laboratório (exercícios cronometrados) no mixer: metrônomo vivo, grave único, curva de energia.",
          "Dicas do visor (kick no fone, um grave por vez, sync como treino) valem para qualquer combo.",
        ],
      },
      {
        heading: "Limites profissionais",
        body: [
          "Aulas em vídeo vêm do YouTube embutido. Não extraia áudio de clipe.",
          "Bronze cobre o módulo Fundação. Prata e Ouro liberam a trilha completa e os exercícios.",
        ],
      },
    ],
  },
  {
    id: "plataformas",
    title: "Plataformas",
    mode: "Modo catálogo · intel profissional",
    route: "/catalogo",
    accent: "#ffcc00",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-doc-plataformas.txt`,
    summary:
      "Beatport, SoundCloud, Deezer, YouTube e Spotify no visor MIXORA: o que cada serviço permite na cabine e o que a lei bloqueia.",
    audience: "Descoberta e limites oficiais de streaming",
    sections: [
      {
        heading: "O que é este modo",
        body: [
          "O catálogo não é um deck de mix. É intel: o que entra no MIXORAPlayerDJ e o que continua nas plataformas oficiais.",
          "MIXORA é o player nativo. Beatport, Spotify, Deezer, SoundCloud e YouTube alimentam visor e academia — não o crossfader.",
        ],
      },
      {
        heading: "Como operar",
        body: [
          "Abra Plataformas. Leia a ficha de cada serviço: capacidades, limites e o uso no MIXORA.",
          "Beatport: charts, BPM/key e o caminho LINK (parceria gated) para cabine real.",
          "Spotify/Deezer: metadados e descoberta. Termos proíbem mix, crossfade e sobreposição.",
          "SoundCloud e YouTube: widget/clipe controlado. A academia usa o caminho legal de embed.",
        ],
      },
      {
        heading: "Limites profissionais",
        body: [
          "Não há download lossless das lojas oficiais por este player.",
          "API Beatport e Spotify Playback SDK exigem parceria e conta Premium — o MIXORA não burla isso.",
        ],
      },
    ],
  },
  {
    id: "area-dj",
    title: "Área DJ",
    mode: "Modo portal · perfil de cabine",
    route: "/dj",
    accent: "#d4c4a0",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-doc-area-dj.txt`,
    summary:
      "Cadastro de oito etapas, login do portal, mural de cabine, combo Bronze/Prata/Ouro e atalhos para mixer e academia.",
    audience: "Identidade profissional e progresso da conta",
    sections: [
      {
        heading: "O que é este modo",
        body: [
          "A Área DJ é o portal do artista: login, mural, hardware declarado e o combo assinado.",
          "O cadastro cobre identidade, contato, perfil artístico, equipamento, redes, carreira, academia e termos.",
        ],
      },
      {
        heading: "Como operar",
        body: [
          "Cadastrar DJ no header abre a jornada. Confirme o e-mail pelo link enviado.",
          "Entre em Área DJ com o mesmo e-mail. O mural mostra experiência, hardware e atalhos da cabine.",
          "Atualizar mural reedita o cadastro. O combo (Bronze, Prata, Ouro) define academia e perfis.",
          "Hardware (CDJ, controladora, mixer, vinil) é declaração de treino — o MIXORA simula os três primeiros no browser.",
        ],
      },
      {
        heading: "Limites profissionais",
        body: [
          "O cadastro é pedagógico. Não substitui booking, selo, press kit oficial nem contrato de residência.",
          "Progresso e perfil ficam no dispositivo até o backend da conta estar ativo na sessão.",
        ],
      },
    ],
  },
  {
    id: "visor",
    title: "Visor digital",
    mode: "Modo HUD · cabine na home",
    route: "/",
    accent: "#f0e2c4",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-doc-visor.txt`,
    summary:
      "HUD da home: BPM, tom, plataforma, ticker de set e o palco MIXORA OS. Ponto de entrada dos outros modos profissionais.",
    audience: "Leitura de metadados em tempo de cabine",
    sections: [
      {
        heading: "O que é este modo",
        body: [
          "O visor digital é a face MIXORA OS na home: dois decks, uma harmonia, chips de plataforma e o pulso do BPM da cabine.",
          "Dele saem Mixer, Harmonia, Academia e o catálogo. O ticker no header simula feed de DJ, track e evento.",
        ],
      },
      {
        heading: "Como operar",
        body: [
          "Abra Início. Leia BPM, key e a plataforma ativa no visor antes de ir ao mixer.",
          "Use os chips e a vitrine de tecnologia para entender MIXORA vs Beatport vs Spotify.",
          "Combos Bronze, Prata e Ouro aparecem na home: escolha o plano e siga para o cadastro.",
          "O Download do header instala o lançador; o visor continua sendo a cabine no browser.",
        ],
      },
      {
        heading: "Limites profissionais",
        body: [
          "O visor não toca catálogo oficial no crossfader. Ele mostra o estado da cabine MIXORA.",
          "Metadados de terceiros são intel. A mixagem pedagógica roda no Mixer CDJ.",
        ],
      },
    ],
  },
  {
    id: "midi",
    title: "Controladora MIDI",
    mode: "Modo equipamento · DDJ-400",
    route: "/mixer",
    accent: "#9dff6a",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-doc-midi.txt`,
    summary:
      "Web MIDI no Mixer CDJ: conectar Pioneer DDJ-400, mapear jog, pitch, EQ, pads de hot cue, LOAD e browser da biblioteca de treino.",
    audience: "Booth com hardware real no browser",
    sections: [
      {
        heading: "O que é este modo",
        body: [
          "O Mixer CDJ escuta Web MIDI. A DDJ-400 mapeia jog, pitch, EQ, transporte, loop, pads de hot cue e o browser da crate de treino.",
          "A controladora resolve SHIFT e modos de pad no hardware. O MIXORA recebe a note certa e dispara a ação da cabine.",
        ],
      },
      {
        heading: "Como operar",
        body: [
          "Abra Mixer CDJ. Autorize MIDI no navegador (Chrome/Edge) quando o diálogo aparecer.",
          "Clique em Conectar controladora. O status mostra porta, latência e o último CC/note ouvido.",
          "LOAD na DDJ-400 arma o picker: clique na tela para escolher o MP3 daquele deck.",
          "Jog no modo CDJ dá nudge; no modo vinyl o prato emula o arrasto. Pitch e EQ seguem a escala da cabine MIXORA.",
        ],
      },
      {
        heading: "Limites profissionais",
        body: [
          "Safari e alguns bloqueadores restringem Web MIDI. Use Chrome ou Edge na cabine com hardware.",
          "O mapa atual é DDJ-400. Outras controladoras não entram neste modo até haver mapa próprio.",
          "MIDI não libera stream de Spotify/Beatport no deck. O arquivo continua sendo loop sintético ou MP3 local.",
        ],
      },
    ],
  },
];

export function docById(id: DownloadDocId): DownloadDoc | undefined {
  return DOWNLOAD_DOCS.find((doc) => doc.id === id);
}

export function isDownloadDocId(value: string): value is DownloadDocId {
  return DOWNLOAD_DOCS.some((doc) => doc.id === value);
}

export function docIdFromHash(hash: string): DownloadDocId | null {
  if (hash === "docs") {
    return DOWNLOAD_DOCS[0]?.id ?? null;
  }
  if (hash.startsWith("docs-")) {
    const id = hash.slice("docs-".length);
    return isDownloadDocId(id) ? id : null;
  }
  return isDownloadDocId(hash) ? hash : null;
}

export function renderDownloadDoc(doc: DownloadDoc): string {
  const blocks = doc.sections.flatMap((section) => [
    section.heading.toUpperCase(),
    ...section.body,
    "",
  ]);
  return [
    `${BRAND.product} ${DOWNLOAD_VERSION}`,
    `Documentação · ${doc.mode}`,
    doc.title,
    "",
    `Rota: ${doc.route}`,
    `Público: ${doc.audience}`,
    "",
    doc.summary,
    "",
    ...blocks,
    "Este material é o manual pedagógico da cabine MIXORA. Não substitui rekordbox, Serato, Engine DJ nem licenças oficiais de streaming.",
    `${BRAND.os} · ${BRAND.slogan}`,
    "",
  ].join("\n");
}

export function renderDocsIndex(): string {
  const lines = DOWNLOAD_DOCS.map(
    (doc, index) =>
      `${String(index + 1).padStart(2, "0")}. ${doc.title} — ${doc.mode} (${doc.fileName})`,
  );
  return [
    `${BRAND.product} ${DOWNLOAD_VERSION} · manual dos modos profissionais`,
    "",
    "Índice",
    ...lines,
    "",
    "Cada arquivo cobre o que o modo faz, como operar e os limites legais/técnicos da cabine.",
    `${BRAND.os} · ${BRAND.slogan}`,
    "",
  ].join("\n");
}

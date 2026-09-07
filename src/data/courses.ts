import type { CourseModule } from "../types";

export const COURSE_MODULES: CourseModule[] = [
  {
    id: "mod-01",
    level: "iniciante",
    title: "Fundação da cabine",
    subtitle: "Ouvir, contar e respeitar o grid",
    lessons: [
      {
        id: "l-01",
        title: "Anatomia da CDJ e da controladora",
        duration: "12 min",
        synopsis:
          "Jog wheel, pitch fader, cue, hot cues, channel fader e tela — o mesmo vocabulário do MIXORAPlayerDJ e das CDJs Pioneer de clube.",
        youtubeId: "Z2l9fouLGrw",
        supportVideos: [
          {
            youtubeId: "Bg4u1pcSnFc",
            title: "Tempo slider, reset, master tempo e sync na CDJ",
            duration: "8 min",
          },
        ],
        references: [
          {
            title: "O que faz cada botão da CDJ-3000",
            url: "https://blog.pioneerdj.com/djtips/what-do-all-of-these-buttons-do/",
            source: "Pioneer DJ",
          },
          {
            title: "CDJ-900NXS — walkthrough oficial (YouTube)",
            url: "https://www.youtube.com/watch?v=0VQWYLrueT4",
            source: "Pioneer DJ Global",
          },
        ],
        practiceNote:
          "No mixer MIXORA, identifique jog, pitch e cue nos decks A/B antes de marcar o checklist.",
        checklist: [
          "Localizar jog wheel, pitch fader, cue e channel fader no hardware ou no simulador",
          "Diferenciar modo vinyl vs CDJ no jog e quando usar nudge",
          "Ler BPM e tom no visor MIXORA enquanto navega a tela da CDJ",
        ],
      },
      {
        id: "l-02",
        title: "Tempo, compassos e contar 32 beats",
        duration: "18 min",
        synopsis:
          "House e techno em 4/4: conte 1-2-3-4, marque frases de 8 compassos (32 beats) e saiba onde a música muda antes de mixar.",
        youtubeId: "P2s2dxhpcd4",
        supportVideos: [
          {
            youtubeId: "Z2l9fouLGrw",
            title: "Referência de grid — cue e jog na frase certa",
            duration: "trecho 4 min",
          },
        ],
        references: [
          {
            title: "Como contar compassos e frases para DJs",
            url: "https://djnajade.com/how-to-count-bars-and-phrases/",
            source: "NaJade",
          },
          {
            title: "DJ phrasing — quando entrar na mixagem",
            url: "https://sirenmix.com/blog/dj-phrasing-guide",
            source: "SirenMix",
          },
        ],
        practiceNote:
          "Use o metrônomo do visor MIXORA (124 BPM) e conte em voz alta até fechar 32 beats sem olhar a waveform.",
        checklist: [
          "Contar 8, 16 e 32 beats em voz alta seguindo o kick",
          "Marcar o downbeat (beat 1) de cada frase de 8 compassos",
          "Apontar no visor onde você faria a entrada da próxima faixa",
        ],
      },
      {
        id: "l-03",
        title: "Ganho, cue de fone e volume de booth",
        duration: "10 min",
        synopsis:
          "Trim/gain até o LED amarelo, cue no fone sem vazar no master e booth independente — headroom de ~6 dB antes do vermelho.",
        youtubeId: "YzdwR2432VI",
        supportVideos: [
          {
            youtubeId: "4m7fDlzKK10",
            title: "Split cue — ouvir master e pré-escuta ao mesmo tempo",
            duration: "7 min",
          },
        ],
        references: [
          {
            title: "Gain staging para DJs — trim, master e booth",
            url: "https://edm-ghost-production.com/dj-knowledge-base/gain-staging-for-djs",
            source: "EDM Ghost Production",
          },
          {
            title: "O que faz o knob de cue mix",
            url: "https://www.mixgraph.io/glossary/cue-mix-knob",
            source: "Mixgraph",
          },
        ],
        practiceNote:
          "No MIXORA Mixer, ajuste trim dos decks até o visor mostrar headroom e teste cue A/B só no fone imaginário da cabine.",
        checklist: [
          "Ajustar trim até o pico ficar no verde/amarelo, nunca no vermelho",
          "Pré-escutar no cue sem mandar o sinal para o master da pista",
          "Separar volume de booth/monitor do master que vai para o PA",
        ],
      },
    ],
  },
  {
    id: "mod-02",
    level: "intermediario",
    title: "Beatmatch e transições",
    subtitle: "Duas decks, um groove",
    lessons: [
      {
        id: "l-04",
        title: "Pitch fader e nudge no jog",
        duration: "22 min",
        synopsis: "Acoplar BPMs no ouvido, sem depender só do sync.",
        checklist: [
          "Alinhar BPM A e B no visor",
          "Usar jog para adiantar/atrasar o kick",
          "Segurar 16 compassos sem drift",
        ],
      },
      {
        id: "l-05",
        title: "EQ de 3 bandas e o corte de graves",
        duration: "16 min",
        synopsis: "Low kill no deck que entra, mid/high para costurar vocais e hats.",
        checklist: [
          "Nunca dois kicks no mesmo low",
          "Abrir high da track nova no último 8",
          "Voltar EQ a 12h depois da troca",
        ],
      },
      {
        id: "l-06",
        title: "Crossfader, curvas e phrasing",
        duration: "14 min",
        synopsis: "Curva suave vs. cut de scratch. Frases de 32 para trocar de tema.",
        checklist: [
          "Trocar no começo da frase, nunca no meio do vocal",
          "Escolher curva para house vs. techno",
          "Usar channel faders se o crossfader estiver em scratch",
        ],
      },
      {
        id: "l-11",
        title: "Sync",
        duration: "15 min",
        synopsis:
          "Beat Sync, Master Tempo e quantização: atalho para estudar harmonia e phrasing, não muleta para pular o beatmatch no ouvido.",
        youtubeId: "Bg4u1pcSnFc",
        references: [
          {
            title: "Master Tempo e Sync na CDJ — guia Pioneer",
            url: "https://blog.pioneerdj.com/djtips/master-tempo-and-sync/",
            source: "Pioneer DJ",
          },
          {
            title: "Por que DJs de clube ainda fazem beatmatch manual",
            url: "https://djtechtools.com/2019/03/15/why-manual-beatmatching-still-matters/",
            source: "DJ TechTools",
          },
        ],
        practiceNote:
          "No MIXORA Mixer, ligue o sync só para alinhar BPM e keys; desligue e segure 32 beats no jog antes de marcar concluída.",
        checklist: [
          "Identificar botão Sync e Master Tempo no deck A e B",
          "Acoplar BPM com sync e confirmar no visor MIXORA",
          "Desligar sync e recuperar o alinhamento só com pitch e jog",
        ],
      },
      {
        id: "l-12",
        title: "Qual melhor codec para tracks",
        duration: "13 min",
        synopsis:
          "WAV e AIFF sem perda para clube, FLAC para arquivo, MP3 320 kbps só quando a fonte for confiável — metadados, key e BPM intactos no USB.",
        references: [
          {
            title: "Lossless vs. lossy — o que levar para o USB de clube",
            url: "https://www.digitaldjtips.com/lossless-vs-lossy-audio-for-djs/",
            source: "Digital DJ Tips",
          },
          {
            title: "Formatos de áudio para DJ — WAV, AIFF, MP3 e FLAC",
            url: "https://www.beatportal.com/articles/771398-audio-file-formats-for-djs",
            source: "Beatportal",
          },
        ],
        practiceNote:
          "Exporte a mesma faixa em WAV e MP3 320, carregue nos decks MIXORA e compare waveform + key no visor antes de mixar.",
        checklist: [
          "Diferenciar WAV/AIFF (sem perda) de MP3/AAC (com perda)",
          "Preferir 44,1 kHz / 16-bit ou 24-bit para export de clube",
          "Conferir key e BPM nos metadados antes de gravar o USB",
        ],
      },
    ],
  },
  {
    id: "mod-03",
    level: "avancado",
    title: "Harmonia, energia e palco",
    subtitle: "Do loop ao peak time",
    lessons: [
      {
        id: "l-07",
        title: "Camelot / tom musical e mix harmônico",
        duration: "20 min",
        synopsis: "Vizinhanças de tom, energy boost e quando quebrar a regra de propósito.",
        practiceNote:
          "Na home, clique 8A no visor Camelot e feche o quadrado 8A → 8B → 9B → 9A no mixer. Estude os guias em Harmonia antes de marcar o checklist.",
        checklist: [
          "Ler a key no visor MIXORA",
          "Planejar 4 faixas em círculo de quintas",
          "Usar um contraste de tom no drop",
        ],
      },
      {
        id: "l-08",
        title: "Hot cues, loops e stems pedagógicos",
        duration: "18 min",
        synopsis: "Loops de 8 beats, skip de intro e isolação de kick para treino.",
        checklist: [
          "Mapear cue 1 no downbeat",
          "Loop de 8 no breakdown",
          "Treinar entrada no drop sem olhar",
        ],
      },
      {
        id: "l-09",
        title: "Leitura de pista e dinâmica de set",
        duration: "24 min",
        synopsis: "Abrir, construir, peak e fechar. Energia sem queimar o clube cedo.",
        checklist: [
          "Desenhar arco de 60 minutos",
          "Reservar 2 IDs para o peak",
          "Ter um plano B de 6 faixas mais lentas",
        ],
      },
    ],
  },
  {
    id: "mod-04",
    level: "conclusao",
    title: "Conclusão de cabine",
    subtitle: "Do simulador ao equipamento real",
    lessons: [
      {
        id: "l-10",
        title: "Checklist de booth e ética de set",
        duration: "12 min",
        synopsis: "USB, cabos, rec, direitos, créditos e o que não fazer com catálogos licenciados.",
        checklist: [
          "Exportar um set de 30 min no MIXORAPlayerDJ",
          "Listar 3 faixas por plataforma (metadados)",
          "Assinar o manifesto de direitos do cadastro DJ",
        ],
      },
    ],
  },
];

import { BRAND } from "./brand";
import type { DownloadPack } from "../types";

export const DOWNLOAD_VERSION = "1.0.0";

export const DOWNLOAD_PACKS: readonly DownloadPack[] = [
  {
    id: "windows-x64",
    family: "windows",
    arch: "x64",
    name: "Windows 64-bit",
    short: "Win x64",
    accent: "#3ee8d6",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-windows-x64.zip`,
    fileKind: "ZIP · atalho .url + lançador .bat",
    summary: "Pacote para PCs Windows Intel/AMD. Extrai o atalho da cabine e um lançador .bat.",
    requirements: "Windows 10 ou 11, 64-bit. Chrome, Edge ou Firefox atualizado.",
    installSteps: [
      "Baixe o ZIP pelo botão Download desta tela.",
      "Abra a pasta Downloads e extraia o arquivo (botão direito → Extrair tudo).",
      "Dê dois cliques em MIXORAPlayerDJ.url — o MIXORA abre no navegador.",
      "Se o Windows bloquear o .bat, use o atalho .url. O SmartScreen avisa em arquivos novos: Mais informações → Executar assim mesmo.",
      "Opcional: fixe o site em Aplicativo (Edge/Chrome → ⋮ → Aplicativos → Instalar MIXORAPlayerDJ).",
    ],
  },
  {
    id: "windows-arm64",
    family: "windows",
    arch: "arm64",
    name: "Windows ARM",
    short: "Win ARM",
    accent: "#8ff5ea",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-windows-arm64.zip`,
    fileKind: "ZIP · atalho .url + lançador .bat",
    summary: "Pacote para Surface e PCs Windows em ARM. Mesmo lançador, arquitetura nativa.",
    requirements: "Windows 11 ARM. Edge ou Chrome.",
    installSteps: [
      "Baixe o ZIP ARM pelo botão desta placa.",
      "Extraia o arquivo na pasta Downloads.",
      "Abra MIXORAPlayerDJ.url para entrar na cabine.",
      "No Edge, use Aplicativos → Instalar este site como aplicativo para fixar na barra de tarefas.",
      "Evite o emulador x64 se o pacote ARM estiver disponível — ele é o recomendado neste dispositivo.",
    ],
  },
  {
    id: "macos-arm64",
    family: "macos",
    arch: "arm64",
    name: "macOS Apple Silicon",
    short: "Apple Silicon",
    accent: "#e85aa8",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-macos-apple-silicon.zip`,
    fileKind: "ZIP · .webloc + .command",
    summary: "Pacote para Macs M1, M2, M3 e M4. Atalho webloc e script .command.",
    requirements: "macOS 13 ou superior, chip Apple Silicon. Safari ou Chrome.",
    installSteps: [
      "Baixe o ZIP Apple Silicon.",
      "Abra o arquivo no Finder — o macOS descompacta sozinho.",
      "Dê dois cliques em MIXORAPlayerDJ.webloc, ou clique com o botão direito no .command → Abrir.",
      "Na primeira vez o Gatekeeper pede confirmação: Abrir mesmo assim.",
      "No Safari: Arquivo → Adicionar ao Dock. No Chrome: ⋮ → Instalar MIXORAPlayerDJ.",
    ],
  },
  {
    id: "macos-x64",
    family: "macos",
    arch: "x64",
    name: "macOS Intel",
    short: "Mac Intel",
    accent: "#ff8ec8",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-macos-intel.zip`,
    fileKind: "ZIP · .webloc + .command",
    summary: "Pacote para Macs Intel. Mesmo fluxo de atalho, binário de lançamento x64.",
    requirements: "macOS 12 ou superior, processador Intel. Safari ou Chrome.",
    installSteps: [
      "Baixe o ZIP Intel.",
      "Abra o ZIP no Finder.",
      "Use MIXORAPlayerDJ.webloc para abrir a cabine.",
      "Se o .command aparecer bloqueado: Ajustes → Privacidade e segurança → Abrir mesmo assim.",
      "Adicione ao Dock pelo Safari ou instale como app no Chrome.",
    ],
  },
  {
    id: "linux-x64",
    family: "linux",
    arch: "x64",
    name: "Linux 64-bit",
    short: "Linux x64",
    accent: "#d4c4a0",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-linux-x64.zip`,
    fileKind: "ZIP · .sh + .desktop",
    summary: "Pacote para Ubuntu, Fedora, Debian e ChromeOS x64. Script e atalho .desktop.",
    requirements: "glibc recente, xdg-open, Chrome/Chromium/Firefox.",
    installSteps: [
      "Baixe o ZIP Linux x64.",
      "Extraia: unzip MIXORAPlayerDJ-*.zip",
      "Torne o script executável: chmod +x mixora-player-dj.sh",
      "Rode ./mixora-player-dj.sh — o xdg-open abre o MIXORA no navegador padrão.",
      "Copie mixora-player-dj.desktop para ~/.local/share/applications/ para aparecer no menu.",
    ],
  },
  {
    id: "linux-arm64",
    family: "linux",
    arch: "arm64",
    name: "Linux ARM",
    short: "Linux ARM",
    accent: "#f0e2c4",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-linux-arm64.zip`,
    fileKind: "ZIP · .sh + .desktop",
    summary: "Pacote para Raspberry Pi, Asahi e Chromebooks ARM. Mesmo lançador, arch aarch64.",
    requirements: "Linux aarch64 com xdg-utils.",
    installSteps: [
      "Baixe o ZIP Linux ARM.",
      "Extraia o arquivo na pasta de downloads.",
      "chmod +x mixora-player-dj.sh && ./mixora-player-dj.sh",
      "Opcional: instale o .desktop no menu de aplicativos.",
      "No Chromebook ARM, use o Chrome → Instalar MIXORAPlayerDJ como PWA.",
    ],
  },
  {
    id: "android",
    family: "android",
    arch: "universal",
    name: "Android",
    short: "Android",
    accent: "#9dff6a",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-android.zip`,
    fileKind: "ZIP · guia PWA + atalho HTML",
    summary: "Pacote para telefone e tablet Android. Instala a cabine na tela inicial via Chrome.",
    requirements: "Android 10+, Chrome ou Edge. Sem APK de loja nesta versão.",
    installSteps: [
      "Baixe o ZIP Android e extraia, ou toque em Abrir cabine no atalho HTML.",
      "Abra o MIXORAPlayerDJ no Chrome.",
      "Toque no menu ⋮ → Adicionar à tela inicial / Instalar app.",
      "Confirme MIXORAPlayerDJ — o ícone entra na gaveta e na home.",
      "Abra pelo ícone: a cabine roda em tela cheia, sem a barra do Chrome.",
    ],
  },
  {
    id: "ios",
    family: "ios",
    arch: "universal",
    name: "iOS / iPadOS",
    short: "iOS",
    accent: "#9b7dff",
    fileName: `${BRAND.product}-${DOWNLOAD_VERSION}-ios.zip`,
    fileKind: "ZIP · guia PWA + atalho HTML",
    summary: "Pacote para iPhone e iPad. A instalação passa pelo Safari (Adicionar à Tela de Início).",
    requirements: "iOS 16 ou iPadOS 16+, Safari. A App Store não hospeda este player pedagógico.",
    installSteps: [
      "Baixe o ZIP no Arquivos, ou abra MIXORAPlayerDJ.html no Safari.",
      "No Safari, toque em Compartilhar (quadrado com seta).",
      "Escolha Adicionar à Tela de Início.",
      "Confirme o nome MIXORAPlayerDJ e toque em Adicionar.",
      "Abra o ícone na home — a cabine abre como app, sem a barra do Safari.",
    ],
  },
];

export const DOWNLOAD_WIZARD = [
  {
    step: 1 as const,
    title: "Detectar o sistema",
    hint: "O MIXORA lê o sistema operacional deste dispositivo e sugere o arquivo certo.",
  },
  {
    step: 2 as const,
    title: "Escolher a plataforma",
    hint: "Confirme o pacote recomendado ou troque para Windows, macOS, Linux, Android ou iOS.",
  },
  {
    step: 3 as const,
    title: "Baixar o arquivo",
    hint: "O botão Download monta um ZIP com o lançador daquele SO e dispara o save no navegador.",
  },
  {
    step: 4 as const,
    title: "Instalar o lançador",
    hint: "Extraia o ZIP e siga os passos do sistema escolhido — atalho, script ou PWA.",
  },
  {
    step: 5 as const,
    title: "Abrir a cabine",
    hint: "O lançador abre o MIXORAPlayerDJ. Mixer e academia ficam no mesmo visor.",
  },
] as const;

export function packById(id: DownloadPack["id"]): DownloadPack | undefined {
  return DOWNLOAD_PACKS.find((pack) => pack.id === id);
}

export function isDownloadPackId(value: string): value is DownloadPack["id"] {
  return DOWNLOAD_PACKS.some((pack) => pack.id === value);
}

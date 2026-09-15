/**
 * Descobre o endpoint de áudio da Pioneer DDJ-400 para o bus de cue do Mamute.
 *
 * O jack PHONES da controladora só recebe o cue digital se o browser apontar um
 * `AudioContext` separado para `DDJ-400 WASAPI : PHONES`. O contexto do master
 * fica no destino padrão, senão o PFL vazaria no RCA.
 *
 * No Chrome, `setSinkId` exige permissão explícita do usuário para saídas que
 * não são o destino padrão, e por isso o fluxo principal é
 * `selectAudioOutput()` e não apenas `enumerateDevices()`.
 */

const CUE_SINK_STORAGE_KEY = "mamute.cue-sink-device-id";

/** Estado do roteamento de cue para a saída de fone. */
export type CueAudioRoutingStatus =
  | "unsupported"
  | "default"
  | "searching"
  | "routed"
  | "unavailable"
  | "error";

/**
 * Normaliza o rótulo de um dispositivo para comparação tolerante ao Windows.
 *
 * @param label Texto de `MediaDeviceInfo.label`.
 */
function normalizeDeviceLabel(label: string): string {
  return label.toUpperCase().replace(/[\s_\-():+]+/g, "");
}

/**
 * Diz se o rótulo aponta para a interface de áudio da DDJ-400.
 *
 * @param label Texto de `MediaDeviceInfo.label`.
 */
export function isDdj400AudioLabel(label: string): boolean {
  return normalizeDeviceLabel(label).includes("DDJ400");
}

/**
 * Diz se o rótulo é um jack de fone da DDJ-400, e não o RCA de master.
 *
 * LINE, SPEAKER e MASTER no Windows apontam para o par 1/2, que é o master.
 *
 * @param label Texto de `MediaDeviceInfo.label`.
 */
export function isDdj400PhonesLabel(label: string): boolean {
  if (!isDdj400AudioLabel(label)) return false;
  const normalized = normalizeDeviceLabel(label);
  if (normalized.includes("MIDI")) return false;
  if (normalized.includes("MASTER")) return false;
  if (normalized.includes("LINE")) return false;
  if (normalized.includes("SPEAKER") || normalized.includes("ALTOFALANTE")) return false;
  return (
    normalized.includes("PHONES") ||
    normalized.includes("HEADPHONE") ||
    normalized.includes("PHONE") ||
    normalized.includes("OUVIDO") ||
    normalized.includes("FONE")
  );
}

/**
 * Diz se a saída mandaria o cue para o mesmo caminho do master da pista.
 *
 * @param label Texto de `MediaDeviceInfo.label`.
 */
export function isCueLeakOutputLabel(label: string): boolean {
  const normalized = normalizeDeviceLabel(label);
  if (normalized.includes("MASTER")) return true;
  if (!isDdj400AudioLabel(label)) return false;
  return (
    normalized.includes("LINE") ||
    normalized.includes("SPEAKER") ||
    normalized.includes("ALTOFALANTE")
  );
}

/**
 * Pontua um dispositivo de saída da DDJ-400 para o cue de fone.
 *
 * Só PHONES / HEADPHONE / FONE entram, porque LINE e SPEAKER no Windows são o
 * par USB do master e vazariam o PFL no RCA.
 *
 * @param device Entrada de `enumerateDevices`.
 * @returns Pontuação maior significa melhor candidato, ou −1 se descartado.
 */
export function scoreDdj400PhonesDevice(device: MediaDeviceInfo): number {
  if (device.kind !== "audiooutput") return -1;
  const label = device.label?.trim() ?? "";
  if (!label) return -1;
  if (!isDdj400PhonesLabel(label)) return -1;

  const normalized = normalizeDeviceLabel(label);
  if (normalized.includes("PHONES") || normalized.includes("HEADPHONE")) return 100;
  if (normalized.includes("WASAPI") && normalized.includes("PHONE")) return 90;
  return 95;
}

/**
 * Escolhe o melhor endpoint de fone da DDJ-400 entre os dispositivos listados.
 *
 * @param devices Resultado de `enumerateDevices`.
 */
export function pickDdj400PhonesDevice(
  devices: readonly MediaDeviceInfo[],
): MediaDeviceInfo | null {
  let best: MediaDeviceInfo | null = null;
  let bestScore = -1;

  for (const device of devices) {
    const score = scoreDdj400PhonesDevice(device);
    if (score > bestScore) {
      bestScore = score;
      best = device;
    }
  }

  return best;
}

/**
 * Resolve uma saída de áudio pelo `deviceId` retornado pelo browser.
 *
 * @param devices Resultado de `enumerateDevices`.
 * @param deviceId Id escolhido pelo usuário ou persistido na sessão.
 */
export function resolveAudioOutputDevice(
  devices: readonly MediaDeviceInfo[],
  deviceId: string,
): MediaDeviceInfo | null {
  return (
    devices.find((device) => device.kind === "audiooutput" && device.deviceId === deviceId) ?? null
  );
}

/**
 * Diz se o browser consegue rotear o cue para outro dispositivo de saída.
 *
 * O Chrome 110+ expõe `AudioContext.setSinkId`, que é o caminho preferido.
 * Browsers mais antigos ainda podem usar `HTMLAudioElement.setSinkId`.
 */
export function isCueSinkRoutingSupported(): boolean {
  const hasContextSink =
    typeof AudioContext !== "undefined" && "setSinkId" in AudioContext.prototype;
  const hasElementSink =
    typeof HTMLAudioElement !== "undefined" && "setSinkId" in HTMLAudioElement.prototype;
  return hasContextSink || hasElementSink;
}

/**
 * Diz se o browser expõe o seletor nativo de saída de áudio.
 */
export function isCueOutputPickerSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.selectAudioOutput === "function"
  );
}

/**
 * Abre o seletor de saída do Chrome e devolve o dispositivo escolhido.
 */
export async function requestCueOutputDevice(): Promise<MediaDeviceInfo | null> {
  if (!isCueOutputPickerSupported()) return null;
  try {
    return await navigator.mediaDevices.selectAudioOutput();
  } catch {
    return null;
  }
}

/**
 * Lista os nomes dos candidatos DDJ-400 vistos na enumeração, para diagnóstico.
 *
 * @param devices Resultado de `enumerateDevices`.
 */
export function listDdj400AudioOutputLabels(devices: readonly MediaDeviceInfo[]): string[] {
  return devices
    .filter((device) => device.kind === "audiooutput" && isDdj400AudioLabel(device.label ?? ""))
    .map((device) => device.label?.trim() || device.deviceId);
}

/**
 * Lista todas as saídas de áudio visíveis, para diagnóstico quando o auto-match falha.
 *
 * @param devices Resultado de `enumerateDevices`.
 */
export function listAudioOutputLabels(devices: readonly MediaDeviceInfo[]): string[] {
  return devices
    .filter((device) => device.kind === "audiooutput")
    .map((device) => device.label?.trim() || "(sem nome — escolha manual)");
}

/**
 * Lê o `deviceId` de fone salvo na sessão do browser.
 */
export function loadStoredCueSinkId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(CUE_SINK_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persiste o `deviceId` de fone escolhido pelo usuário.
 *
 * @param deviceId Id da saída ou `null` para limpar.
 */
export function saveStoredCueSinkId(deviceId: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (deviceId) sessionStorage.setItem(CUE_SINK_STORAGE_KEY, deviceId);
    else sessionStorage.removeItem(CUE_SINK_STORAGE_KEY);
  } catch {
    // Storage bloqueado — o roteamento continua válido até recarregar a página.
  }
}

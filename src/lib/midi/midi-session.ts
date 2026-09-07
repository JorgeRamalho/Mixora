/**
 * Sessão Web MIDI filtrada para a Pioneer DDJ-400.
 *
 * A sessão vive no módulo, e não no React, porque o Strict Mode monta e
 * desmonta o hook duas vezes. Se o dispose da primeira instância zerar
 * `onmidimessage` depois da segunda abrir a porta, o chip mostra conectada
 * e a controladora continua muda.
 */

/** Trecho do nome da porta que o Windows e o Chrome usam para a DDJ-400. */
export const DDJ_400_NAME_FRAGMENT = "DDJ-400";

export type MidiLinkStatus = "unavailable" | "denied" | "disconnected" | "connected";

export interface MidiSessionSnapshot {
  status: MidiLinkStatus;
  deviceName: string | null;
  ports: string[];
  error: string | null;
}

type BytesHandler = (data: Uint8Array, timeStamp: number) => void;
type StatusListener = (snapshot: MidiSessionSnapshot) => void;

const byteHandlers = new Set<BytesHandler>();
const statusListeners = new Set<StatusListener>();

let snapshot: MidiSessionSnapshot = {
  status: typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function"
    ? "disconnected"
    : "unavailable",
  deviceName: null,
  ports: [],
  error: null,
};

let access: MIDIAccess | null = null;
let stops: Array<() => void> = [];
let startPromise: Promise<void> | null = null;
let attachChain: Promise<void> = Promise.resolve();

/**
 * Diz se o browser expõe a Web MIDI API.
 */
export function isMidiApiAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
}

/**
 * Pede acesso MIDI sem sysex, porque o parser da PoC ignora essas mensagens.
 */
export async function requestDdj400Access(): Promise<MIDIAccess> {
  return navigator.requestMIDIAccess({ sysex: false });
}

/**
 * Diz se o nome ou o fabricante da porta apontam para a DDJ-400.
 *
 * O Windows às vezes rotula a porta como `MIDIIN2 (2- DDJ-400)` ou omite o hífen,
 * e por isso a comparação ignora espaço, underscore e parênteses.
 *
 * @param name `MIDIInput.name`, que pode vir vazio.
 * @param manufacturer `MIDIInput.manufacturer`, em geral Pioneer DJ.
 */
export function isDdj400PortName(name?: string | null, manufacturer?: string | null): boolean {
  const blob = `${name ?? ""} ${manufacturer ?? ""}`.toUpperCase().replace(/[\s_\-()]+/g, "");
  return blob.includes("DDJ400");
}

/**
 * Lista os nomes visíveis das portas de entrada, para o chip mostrar o que o
 * Chrome enxergou quando o filtro da DDJ-400 falha.
 *
 * @param midi Resultado de `requestMIDIAccess`.
 */
export function listMidiInputNames(midi: MIDIAccess): string[] {
  return [...midi.inputs.values()].map((input) => input.name?.trim() || input.id);
}

/**
 * Escolhe as portas da DDJ-400, ou a única porta MIDI se o nome não bateu.
 *
 * @param midi Resultado de `requestMIDIAccess`.
 */
export function selectDdj400Inputs(midi: MIDIAccess): MIDIInput[] {
  const inputs = [...midi.inputs.values()];
  const named = inputs.filter((input) => isDdj400PortName(input.name, input.manufacturer));
  if (named.length > 0) return named;
  if (inputs.length === 1) {
    const only = inputs[0];
    return only ? [only] : [];
  }
  return [];
}

/**
 * Abre a porta e liga o handler. No Chromium, só `onmidimessage` abre o
 * input, ao passo que `addEventListener("midimessage")` deixa a porta muda.
 * O dispose só zera o handler se ele ainda for o nosso, senão a segunda
 * instância do Strict Mode perderia a escuta.
 *
 * A escuta usa **apenas** o atributo, e não também o `addEventListener`.
 * Registrar nos dois parece redundância inofensiva, mas o `MIDIInput` é um
 * `EventTarget` e o atributo dispara **junto** dos listeners em vez de
 * substituí-los, ou seja cada mensagem seria processada duas vezes. Uma
 * validação na DDJ-400 mostrou o sintoma: um clique de encoder movia o cursor
 * três posições, porque o gesto era contado mais de uma vez.
 *
 * @param input Porta de entrada MIDI.
 * @param onMessage Bytes crus de cada mensagem e o `timeStamp` do evento.
 */
export async function listenMidiInput(
  input: MIDIInput,
  onMessage: (data: Uint8Array, timeStamp: number) => void,
): Promise<() => void> {
  const handler = (event: MIDIMessageEvent) => {
    if (!event.data) return;
    const data = event.data instanceof Uint8Array ? event.data : new Uint8Array(event.data);
    onMessage(data, event.timeStamp);
  };
  input.onmidimessage = handler;
  await input.open();
  return () => {
    if (input.onmidimessage === handler) input.onmidimessage = null;
  };
}

/**
 * Snapshot atual da sessão, para o hook pintar o chip sem esperar o primeiro evento.
 */
export function getMidiSnapshot(): MidiSessionSnapshot {
  return snapshot;
}

/**
 * Entrega cada pacote MIDI aos handlers do React, inclusive o inject da PoC.
 *
 * @param data Bytes da mensagem.
 * @param timeStamp Instante em que o browser recebeu a mensagem, na mesma base
 * de `performance.now()`. Sem ele o hook não consegue separar a espera na fila
 * do browser do custo do próprio mapper.
 */
export function emitMidiBytes(data: Uint8Array, timeStamp = performance.now()): void {
  for (const handler of byteHandlers) handler(data, timeStamp);
}

/**
 * Injeta bytes como se tivessem vindo da controladora.
 *
 * @param bytes Status, número de CC ou note, e valor.
 */
export function injectMidiBytes(bytes: number[]): void {
  emitMidiBytes(new Uint8Array(bytes));
}

/**
 * Inscreve o mapper nos bytes da sessão. O unmount do React **não** fecha a
 * porta, porque o Strict Mode desmonta na hora seguinte.
 *
 * @param handler Recebe o `Uint8Array` de cada mensagem.
 */
export function subscribeMidiBytes(handler: BytesHandler): () => void {
  byteHandlers.add(handler);
  return () => {
    byteHandlers.delete(handler);
  };
}

/**
 * Inscreve o chip nos estados da sessão.
 *
 * @param listener Recebe o snapshot depois de cada mudança.
 */
export function subscribeMidiStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(snapshot);
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Abre a Web MIDI uma vez por carregamento da página.
 */
export async function startMidiSession(): Promise<void> {
  if (!isMidiApiAvailable()) {
    publish({ status: "unavailable", error: null });
    return;
  }
  if (startPromise) return startPromise;
  startPromise = runStart();
  return startPromise;
}

/**
 * Fecha as portas e pede MIDI de novo, para o botão Religar.
 */
export async function restartMidiSession(): Promise<void> {
  startPromise = null;
  await releasePorts();
  access = null;
  await startMidiSession();
}

async function runStart(): Promise<void> {
  try {
    access = await requestDdj400Access();
    access.onstatechange = () => {
      if (access) void attachPorts(access);
    };
    await attachPorts(access);
    window.__mamuteMidiDebug = () => ({
      snapshot,
      listeners: byteHandlers.size,
      opened: stops.length,
      ports: access
        ? [...access.inputs.values()].map((input) => ({
            name: input.name,
            connection: input.connection,
            state: input.state,
            hasHandler: typeof input.onmidimessage === "function",
          }))
        : [],
    });
  } catch {
    startPromise = null;
    publish({
      status: "denied",
      deviceName: null,
      ports: [],
      error: "Permissão MIDI negada. Clique em conectar e aceite o pedido do Chrome.",
    });
  }
}

/**
 * Serializa as tentativas de anexar portas.
 *
 * O `input.open()` de `listenMidiInput` dispara `onstatechange`, que chama
 * `attachPorts` de novo, e por isso duas execuções se cruzavam: a segunda
 * rodava o `releasePorts` **antes** de a primeira registrar o seu stop, não
 * encontrava nada para remover e deixava o handler anterior escutando para
 * sempre. Enfileirar resolve porque o `releasePorts` de cada rodada passa a
 * ver a lista de stops já completa.
 */
function attachPorts(midi: MIDIAccess): Promise<void> {
  attachChain = attachChain.catch(() => undefined).then(() => runAttach(midi));
  return attachChain;
}

async function runAttach(midi: MIDIAccess): Promise<void> {
  await releasePorts();
  const names = listMidiInputNames(midi);
  const chosen = selectDdj400Inputs(midi);
  if (chosen.length === 0) {
    publish({
      status: "disconnected",
      deviceName: null,
      ports: names,
      error:
        names.length === 0
          ? "Nenhuma porta MIDI. Feche Rekordbox, Mixxx ou Serato e clique de novo."
          : `Portas vistas: ${names.join(", ")}. Nenhuma bate com DDJ-400.`,
    });
    return;
  }

  for (const input of chosen) {
    try {
      stops.push(await listenMidiInput(input, emitMidiBytes));
    } catch {
      publish({
        status: "disconnected",
        deviceName: null,
        ports: names,
        error: "A porta MIDI recusou o open. Feche o outro software que a estiver usando.",
      });
      return;
    }
  }

  publish({
    status: "connected",
    deviceName: chosen
      .map((input) => `${input.name?.trim() || "DDJ-400"} · ${input.connection}`)
      .join(" · "),
    ports: names,
    error: null,
  });
}

async function releasePorts(): Promise<void> {
  for (const stop of stops) stop();
  stops = [];
}

function publish(next: Partial<MidiSessionSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  for (const listener of statusListeners) listener(snapshot);
}

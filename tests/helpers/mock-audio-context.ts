/**
 * Mock mínimo de Web Audio para o `MamuteEngine` no Node.
 *
 * Só implementa o que o engine toca: `currentTime` controlável, buffer em
 * memória e nós com `connect`/`gain.value`. Não tenta ser um polyfill fiel.
 */

export class MockAudioParam {
  value = 0;
}

export class MockAudioNode {
  connections: MockAudioNode[] = [];

  /**
   * Encadeia o nó no destino, como o grafo real, para o engine poder
   * ligar trim → filter → EQ → gain sem checar o retorno.
   *
   * @param dest Nó seguinte do grafo.
   */
  connect(dest: MockAudioNode): MockAudioNode {
    this.connections.push(dest);
    return dest;
  }

  /**
   * Solta ligações do nó. Com destino, remove só aquele fio, como na Web Audio API.
   *
   * @param dest Nó de destino a desconectar, ou omitido para limpar tudo.
   */
  disconnect(dest?: MockAudioNode): void {
    if (dest) {
      this.connections = this.connections.filter((node) => node !== dest);
      return;
    }
    this.connections = [];
  }
}

export class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

export class MockBiquadFilterNode extends MockAudioNode {
  type = "lowpass";
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
  gain = new MockAudioParam();
}

export class MockAnalyserNode extends MockAudioNode {
  fftSize = 512;

  /**
   * Preenche o array com silêncio centrado, que é 128 no time-domain.
   *
   * @param bins Buffer de 8 bits do caller.
   */
  getByteTimeDomainData(bins: Uint8Array): void {
    bins.fill(128);
  }
}

export class MockAudioBuffer {
  readonly duration: number;
  private readonly channels: Float32Array[];

  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.duration = length / sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  /**
   * Devolve o canal para o `buildLoop` escrever kicks e hats.
   *
   * @param channel Índice 0-based.
   */
  getChannelData(channel: number): Float32Array {
    const data = this.channels[channel];
    if (!data) throw new Error(`Canal ${channel} inexistente`);
    return data;
  }
}

export class MockBufferSource extends MockAudioNode {
  buffer: MockAudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  playbackRate = new MockAudioParam();
  started = false;
  stopped = false;
  startWhen = 0;
  startOffset = 0;
  onended: (() => void) | null = null;

  /**
   * Marca o source como iniciado e guarda o offset, que o teste de `toggle`
   * usa para ver se a fase virou posição no buffer.
   *
   * @param when Tempo do contexto, ignorado no mock além do registro.
   * @param offset Posição em segundos dentro do loop.
   */
  start(when = 0, offset = 0): void {
    this.started = true;
    this.startWhen = when;
    this.startOffset = offset;
  }

  /** Para o source, como o engine faz no `stop`. */
  stop(): void {
    this.stopped = true;
    this.started = false;
  }
}

export class MockMediaStreamDestination extends MockAudioNode {
  readonly stream = { id: "mock-cue-stream", getAudioTracks: () => [] };
  channelCount = 2;
}

/** Source de `MediaStream` usado no contexto separado do bus de cue. */
export class MockMediaStreamSource extends MockAudioNode {}

export class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = new MockAudioNode();
  state: AudioContextState = "running";
  sources: MockBufferSource[] = [];
  sinkId = "";
  setSinkId = async (deviceId: string | { type: "none" }): Promise<void> => {
    this.sinkId = typeof deviceId === "string" ? deviceId : "none";
  };

  /**
   * Cria um gain, usado em master, crossfader e canal.
   */
  createGain(): MockGainNode {
    return new MockGainNode();
  }

  /** Cria um biquad, usado em filter e nas três bandas de EQ. */
  createBiquadFilter(): MockBiquadFilterNode {
    return new MockBiquadFilterNode();
  }

  /** Cria o analyser do deck, que a waveform consulta. */
  createAnalyser(): MockAnalyserNode {
    return new MockAnalyserNode();
  }

  /** Destino de `MediaStream` usado no fallback legado do bus de cue. */
  createMediaStreamDestination(): MockMediaStreamDestination {
    return new MockMediaStreamDestination();
  }

  /**
   * Source que lê o stream do bus de cue no contexto de fone.
   *
   * @param _stream Stream gerado por `createMediaStreamDestination`.
   */
  createMediaStreamSource(_stream: { id: string }): MockMediaStreamSource {
    return new MockMediaStreamSource();
  }

  /**
   * Aloca um buffer silencioso do tamanho pedido.
   *
   * @param channels Número de canais.
   * @param length Amostras.
   * @param sampleRate Taxa, em geral a do contexto.
   */
  createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  /** Cria um source e guarda na lista para o teste inspecionar o último. */
  createBufferSource(): MockBufferSource {
    const source = new MockBufferSource();
    this.sources.push(source);
    return source;
  }

  /** Resume o contexto, que o `ensure` não chama mas o toggle do browser sim. */
  async resume(): Promise<void> {
    this.state = "running";
  }

  /**
   * Decodifica bytes em um buffer silencioso, ou rejeita arquivo minúsculo.
   *
   * @param data Bytes do arquivo.
   */
  async decodeAudioData(data: ArrayBuffer): Promise<MockAudioBuffer> {
    if (data.byteLength < 16) {
      throw new Error("invalid audio");
    }
    const seconds = Math.max(0.25, Math.min(4, data.byteLength / this.sampleRate));
    const length = Math.floor(this.sampleRate * seconds);
    return this.createBuffer(1, length, this.sampleRate);
  }

  /**
   * Avança o relógio do grafo. O loop de fase lê `currentTime`, e por isso
   * os testes não dependem de `Date.now`.
   *
   * @param seconds Segundos a somar.
   */
  advance(seconds: number): void {
    this.currentTime += seconds;
  }
}

/**
 * Falha de contrato HTTP da biblioteca de faixas.
 *
 * O status 0 significa que o `fetch` nem chegou a responder, ao passo que 404
 * e 5xx vêm do backend. A Query e a cabine leem `status` para decidir retry.
 */
export class TracksApiError extends Error {
  readonly status: number;

  /**
   * @param message Texto já pronto para a UI.
   * @param status Código HTTP, ou 0 se a rede falhou.
   */
  constructor(message: string, status: number) {
    super(message);
    this.name = "TracksApiError";
    this.status = status;
  }
}

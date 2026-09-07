import { AUTH_CODE_TTL_MS } from "./email.js";

export const CODE_RESEND_COOLDOWN_MS = 60_000;

export function authCodeCooldownRemaining(expiresAt: Date | null | undefined): number {
  if (!expiresAt) return 0;
  const issuedAt = expiresAt.getTime() - AUTH_CODE_TTL_MS;
  const elapsed = Date.now() - issuedAt;
  const remaining = CODE_RESEND_COOLDOWN_MS - elapsed;
  return remaining > 0 ? remaining : 0;
}

export function cooldownMessage(remainingMs: number): string {
  const seconds = Math.ceil(remainingMs / 1000);
  return `Aguarde ${seconds} segundo${seconds === 1 ? "" : "s"} antes de pedir um novo código.`;
}

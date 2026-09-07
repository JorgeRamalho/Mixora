import type { Config } from "@netlify/functions";
import { createAuthenticatedPayload, hashPassword, resetPasswordWithCode } from "./_shared/auth.js";
import { AUTH_CODE_LENGTH } from "./_shared/email.js";
import { errorResponse, jsonResponse, normalizeEmail } from "./_shared/dj.js";

const MIN_PASSWORD_LENGTH = 8;

type ResetBody = {
  email?: string;
  code?: string;
  password?: string;
};

export default async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let body: ResetBody;
  try {
    body = (await req.json()) as ResetBody;
  } catch {
    return errorResponse("JSON inválido.");
  }

  const email = normalizeEmail(body.email ?? "");
  const code = (body.code ?? "").replace(/\D/g, "");
  const password = body.password ?? "";

  if (!email || code.length !== AUTH_CODE_LENGTH) {
    return errorResponse("Informe o e-mail e o código de 6 dígitos.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return errorResponse(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const passwordHash = await hashPassword(password);
  const reset = await resetPasswordWithCode(email, code, passwordHash);
  if (!reset) {
    return errorResponse("Código inválido ou expirado. Peça um novo código para redefinir a senha.", 400);
  }

  const payload = await createAuthenticatedPayload(reset.accountId, reset.email);
  if (!payload) {
    return errorResponse("Perfil não encontrado para esta conta.", 404);
  }

  return jsonResponse(payload);
};

export const config: Config = {
  path: "/api/dj/reset-password",
  method: "POST",
};

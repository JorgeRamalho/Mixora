import type { Config } from "@netlify/functions";
import { createAuthenticatedPayload, verifyEmailCode } from "./_shared/auth.js";
import { AUTH_CODE_LENGTH } from "./_shared/email.js";
import { errorResponse, jsonResponse, normalizeEmail } from "./_shared/dj.js";

type ConfirmBody = {
  email?: string;
  code?: string;
};

export default async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let body: ConfirmBody;
  try {
    body = (await req.json()) as ConfirmBody;
  } catch {
    return errorResponse("JSON inválido.");
  }

  const email = normalizeEmail(body.email ?? "");
  const code = (body.code ?? "").replace(/\D/g, "");

  if (!email || code.length !== AUTH_CODE_LENGTH) {
    return errorResponse("Informe o e-mail e o código de 6 dígitos.");
  }

  const verified = await verifyEmailCode(email, code);
  if (!verified) {
    return errorResponse("Código inválido ou expirado. Peça um novo código de verificação.", 400);
  }

  const payload = await createAuthenticatedPayload(verified.accountId, verified.email);
  if (!payload) {
    return errorResponse("Perfil não encontrado para esta conta.", 404);
  }

  return jsonResponse(payload);
};

export const config: Config = {
  path: "/api/dj/confirm-verification-code",
  method: "POST",
};

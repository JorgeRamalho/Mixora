import type { Config } from "@netlify/functions";
import {
  findAccountByEmail,
  getProfileByAccountId,
  issueEmailVerification,
  verifyPassword,
} from "./_shared/auth.js";
import { errorResponse, jsonResponse, normalizeEmail } from "./_shared/dj.js";
import { isNetlifyLocalDev, localDevCodeMessage } from "./_shared/email.js";
import { cooldownMessage } from "./_shared/rate-limit.js";

type ResendBody = {
  email?: string;
  password?: string;
};

export default async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let body: ResendBody;
  try {
    body = (await req.json()) as ResendBody;
  } catch {
    return errorResponse("JSON inválido.");
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  if (!email || !password) {
    return errorResponse("E-mail e senha são obrigatórios.");
  }

  const account = await findAccountByEmail(email);
  if (!account) {
    return errorResponse("E-mail ou senha inválidos.", 401);
  }

  const passwordOk = await verifyPassword(password, account.passwordHash);
  if (!passwordOk) {
    return errorResponse("E-mail ou senha inválidos.", 401);
  }

  if (account.emailVerified) {
    return jsonResponse({
      ok: true,
      alreadyVerified: true,
      message: "Este e-mail já está confirmado. Você pode entrar no portal.",
    });
  }

  const profile = await getProfileByAccountId(account.id);
  const artistName = profile?.artistName ?? "";
  const { emailSent, cooldownMs, code } = await issueEmailVerification(account.id, account.email, artistName);

  if (cooldownMs) {
    return jsonResponse({
      ok: true,
      alreadyVerified: false,
      emailSent: false,
      cooldownMs,
      message: cooldownMessage(cooldownMs),
    });
  }

  const localCode = isNetlifyLocalDev() && !emailSent ? code : undefined;

  return jsonResponse({
    ok: true,
    alreadyVerified: false,
    emailSent,
    ...(localCode ? { devCode: localCode } : {}),
    message: emailSent
      ? "Enviamos um novo código de verificação e um link de confirmação para o seu e-mail."
      : localCode
        ? localDevCodeMessage(localCode)
        : "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.",
  });
};

export const config: Config = {
  path: "/api/dj/resend-verification",
  method: "POST",
};

import type { Config } from "@netlify/functions";
import { findAccountByEmail, getProfileByAccountId, issueEmailVerification } from "./_shared/auth.js";
import { errorResponse, jsonResponse, normalizeEmail } from "./_shared/dj.js";
import { localDevCodeMessage, isNetlifyLocalDev, ACCOUNT_NOT_FOUND_MESSAGE } from "./_shared/email.js";
import { runHandler } from "./_shared/handler.js";
import { cooldownMessage } from "./_shared/rate-limit.js";

type SendCodeBody = {
  email?: string;
};

export default async (req: Request) =>
  runHandler(async () => {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    let body: SendCodeBody;
    try {
      body = (await req.json()) as SendCodeBody;
    } catch {
      return errorResponse("JSON inválido.");
    }

    const email = normalizeEmail(body.email ?? "");
    if (!email) {
      return errorResponse("Informe o e-mail cadastrado.");
    }

    const account = await findAccountByEmail(email);
    if (!account) {
      return errorResponse(ACCOUNT_NOT_FOUND_MESSAGE, 404, "ACCOUNT_NOT_FOUND");
    }

    if (account.emailVerified) {
      return jsonResponse({
        ok: true,
        alreadyVerified: true,
        emailSent: false,
        message: "Este e-mail já está confirmado. Use sua senha para entrar no portal.",
      });
    }

    const profile = await getProfileByAccountId(account.id);
    const { emailSent, cooldownMs, code } = await issueEmailVerification(
      account.id,
      account.email,
      profile?.artistName ?? "",
    );

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
        ? "Enviamos um código de verificação para o seu e-mail. Ele vale por 15 minutos."
        : localCode
          ? localDevCodeMessage(localCode)
          : "Não foi possível enviar o e-mail agora. Configure RESEND_API_KEY no Netlify e tente novamente.",
    });
  });

export const config: Config = {
  path: "/api/dj/send-verification-code",
  method: "POST",
};

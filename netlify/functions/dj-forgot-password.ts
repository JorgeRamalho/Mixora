import type { Config } from "@netlify/functions";
import { findAccountByEmail, getProfileByAccountId, issuePasswordReset } from "./_shared/auth.js";
import { errorResponse, jsonResponse, normalizeEmail } from "./_shared/dj.js";
import { isNetlifyLocalDev, localDevCodeMessage, ACCOUNT_NOT_FOUND_MESSAGE } from "./_shared/email.js";
import { runHandler } from "./_shared/handler.js";
import { cooldownMessage } from "./_shared/rate-limit.js";

type ForgotBody = {
  email?: string;
};

export default async (req: Request) =>
  runHandler(async () => {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    let body: ForgotBody;
    try {
      body = (await req.json()) as ForgotBody;
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

    const profile = await getProfileByAccountId(account.id);
    const { emailSent, cooldownMs, code } = await issuePasswordReset(
      account.id,
      account.email,
      profile?.artistName ?? "",
    );

    if (cooldownMs) {
      return jsonResponse({
        ok: true,
        emailSent: false,
        cooldownMs,
        message: cooldownMessage(cooldownMs),
      });
    }

    const localCode = isNetlifyLocalDev() && !emailSent ? code : undefined;

    return jsonResponse({
      ok: true,
      emailSent,
      ...(localCode ? { devCode: localCode } : {}),
      message: emailSent
        ? "Enviamos um código para redefinir a senha. Ele vale por 15 minutos."
        : localCode
          ? localDevCodeMessage(localCode)
          : "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.",
    });
  });

export const config: Config = {
  path: "/api/dj/forgot-password",
  method: "POST",
};

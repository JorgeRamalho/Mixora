import type { Config } from "@netlify/functions";
import { createAuthenticatedPayload, verifyEmailToken } from "./_shared/auth.js";
import { errorResponse, jsonResponse } from "./_shared/dj.js";
import { runHandler } from "./_shared/handler.js";

type VerifyBody = {
  token?: string;
};

export default async (req: Request) =>
  runHandler(async () => {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    let body: VerifyBody;
    try {
      body = (await req.json()) as VerifyBody;
    } catch {
      return errorResponse("JSON inválido.");
    }

    const token = body.token?.trim() ?? "";
    if (!token) {
      return errorResponse("Token de confirmação ausente.");
    }

    const verified = await verifyEmailToken(token);
    if (!verified) {
      return errorResponse("Link inválido ou expirado. Peça um novo e-mail de confirmação.", 400);
    }

    const payload = await createAuthenticatedPayload(verified.accountId, verified.email);
    if (!payload) {
      return errorResponse("Perfil não encontrado para esta conta.", 404);
    }

    return jsonResponse(payload);
  });

export const config: Config = {
  path: "/api/dj/verify-email",
  method: "POST",
};

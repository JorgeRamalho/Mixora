import type { Config } from "@netlify/functions";
import {
  getAcademyProgress,
  requireVerifiedSession,
  upsertAcademyProgress,
} from "./_shared/auth.js";
import { sanitizeCompletedLessons } from "./_shared/academy.js";
import { errorResponse, jsonResponse } from "./_shared/dj.js";

type ProgressBody = {
  completedLessons?: unknown;
};

export default async (req: Request) => {
  const auth = await requireVerifiedSession(req);
  if (!auth) {
    return errorResponse("Sessão expirada ou inválida.", 401);
  }
  if (auth.kind === "unverified") {
    return errorResponse(
      "Confirme o e-mail antes de sincronizar o progresso da academia.",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  if (req.method === "GET") {
    const row = await getAcademyProgress(auth.session.accountId);
    const completedLessons = row?.completedLessons ?? [];
    return jsonResponse({ ok: true, completedLessons });
  }

  if (req.method === "PUT") {
    let body: ProgressBody;
    try {
      body = (await req.json()) as ProgressBody;
    } catch {
      return errorResponse("JSON inválido.");
    }

    const completedLessons = sanitizeCompletedLessons(body.completedLessons);
    const row = await upsertAcademyProgress(auth.session.accountId, completedLessons);

    if (!row) {
      return errorResponse("Não foi possível gravar o progresso.", 500);
    }

    return jsonResponse({ ok: true, completedLessons: row.completedLessons });
  }

  return errorResponse("Method not allowed", 405);
};

export const config: Config = {
  path: "/api/dj/academy-progress",
  method: ["GET", "PUT"],
};

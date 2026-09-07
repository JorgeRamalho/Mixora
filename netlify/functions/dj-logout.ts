import type { Config } from "@netlify/functions";
import { deleteSession, requireValidSession } from "./_shared/auth.js";
import { errorResponse, jsonResponse } from "./_shared/dj.js";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const auth = await requireValidSession(req);
  if (!auth) {
    return errorResponse("Sessão expirada ou inválida.", 401);
  }

  await deleteSession(auth.token);

  return jsonResponse({ ok: true });
};

export const config: Config = {
  path: "/api/dj/logout",
  method: "POST",
};

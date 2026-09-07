import type { Config } from "@netlify/functions";
import {
  getProfileByAccountId,
  requireVerifiedSession,
} from "./_shared/auth.js";
import { errorResponse, jsonResponse, profileRowToClient } from "./_shared/dj.js";

export default async (req: Request) => {
  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  const auth = await requireVerifiedSession(req);
  if (!auth) {
    return errorResponse("Sessão expirada ou inválida.", 401);
  }
  if (auth.kind === "unverified") {
    return errorResponse(
      "Confirme o e-mail antes de acessar o perfil.",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  const profile = await getProfileByAccountId(auth.account.id);
  if (!profile) {
    return errorResponse("Perfil não encontrado.", 404);
  }

  return jsonResponse({
    ok: true,
    profile: profileRowToClient(profile, auth.account.email),
    selectedPlan: profile.selectedPlan,
  });
};

export const config: Config = {
  path: "/api/dj/profile",
  method: "GET",
};

import type { Config } from "@netlify/functions";
import {
  createSession,
  findAccountByEmail,
  getProfileByAccountId,
  verifyPassword,
} from "./_shared/auth.js";
import {
  errorResponse,
  jsonResponse,
  normalizeEmail,
  profileRowToClient,
} from "./_shared/dj.js";

type LoginBody = {
  email?: string;
  password?: string;
};

export default async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
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

  if (!account.emailVerified) {
    return errorResponse(
      "Confirme o e-mail antes de entrar. Use Receber código na Área do DJ ou abra o link enviado na sua caixa de entrada.",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  const profile = await getProfileByAccountId(account.id);
  if (!profile) {
    return errorResponse("Perfil não encontrado para esta conta.", 404);
  }

  const session = await createSession(account.id);

  return jsonResponse({
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    session: {
      email: account.email,
      artistName: profile.artistName,
      loggedInAt: Date.now(),
    },
    profile: profileRowToClient(profile, account.email),
  });
};

export const config: Config = {
  path: "/api/dj/login",
  method: "POST",
};

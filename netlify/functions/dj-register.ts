import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { djAccounts, djProfiles } from "../../db/schema.js";
import type { DjProfile } from "../../src/types/dj.js";
import {
  createSession,
  findAccountByEmail,
  hashPassword,
  issueEmailVerification,
} from "./_shared/auth.js";
import {
  errorResponse,
  isValidProfile,
  jsonResponse,
  normalizeEmail,
  profileInputToRow,
  profileRowToClient,
} from "./_shared/dj.js";
import { isNetlifyLocalDev, localDevCodeMessage } from "./_shared/email.js";

const MIN_PASSWORD_LENGTH = 8;

type RegisterBody = {
  profile?: DjProfile;
  password?: string;
  selectedPlan?: string | null;
};

async function respondWithVerification(
  accountId: string,
  email: string,
  artistName: string,
  profile: DjProfile,
  mode: "created" | "updated",
) {
  const { emailSent, code } = await issueEmailVerification(accountId, email, artistName);
  const localCode = isNetlifyLocalDev() && !emailSent ? code : undefined;
  return jsonResponse({
    ok: true,
    mode,
    emailVerificationRequired: true,
    emailSent,
    ...(localCode ? { devCode: localCode } : {}),
    profile,
    message: emailSent
      ? "Cadastro gravado. Enviamos um código de verificação e um link — use um dos dois para entrar no portal."
      : localCode
        ? `Cadastro gravado. ${localDevCodeMessage(localCode)}`
        : "Cadastro gravado. Confirme o e-mail pelo código ou pelo link (peça reenvio na Área do DJ).",
  });
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return errorResponse("JSON inválido.");
  }

  const profile = body.profile;
  const password = body.password ?? "";
  const selectedPlan = body.selectedPlan ?? null;

  if (!profile) {
    return errorResponse("Perfil não enviado.");
  }

  const validationError = isValidProfile(profile);
  if (validationError) {
    return errorResponse(validationError);
  }

  const email = normalizeEmail(profile.email);
  const existing = await findAccountByEmail(email);

  if (!existing && password.length < MIN_PASSWORD_LENGTH) {
    return errorResponse(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  if (existing && password && password.length < MIN_PASSWORD_LENGTH) {
    return errorResponse(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const profileData = profileInputToRow({ ...profile, email }, selectedPlan);
  const now = new Date();

  if (existing) {
    if (password) {
      const passwordHash = await hashPassword(password);
      await db
        .update(djAccounts)
        .set({ passwordHash, updatedAt: now })
        .where(eq(djAccounts.id, existing.id));
    }

    await db
      .update(djProfiles)
      .set(profileData)
      .where(eq(djProfiles.accountId, existing.id));

    const [updatedProfile] = await db
      .select()
      .from(djProfiles)
      .where(eq(djProfiles.accountId, existing.id))
      .limit(1);

    if (!updatedProfile) {
      return errorResponse("Perfil não encontrado após atualização.", 500);
    }

    const clientProfile = profileRowToClient(updatedProfile, email);

    if (!existing.emailVerified) {
      return respondWithVerification(existing.id, email, updatedProfile.artistName, clientProfile, "updated");
    }

    const session = await createSession(existing.id);
    return jsonResponse({
      ok: true,
      mode: "updated",
      emailVerificationRequired: false,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      profile: clientProfile,
    });
  }

  const passwordHash = await hashPassword(password);
  const [account] = await db
    .insert(djAccounts)
    .values({
      email,
      passwordHash,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!account) {
    return errorResponse("Não foi possível criar a conta.", 500);
  }

  const [createdProfile] = await db
    .insert(djProfiles)
    .values({
      accountId: account.id,
      ...profileData,
      createdAt: now,
    })
    .returning();

  if (!createdProfile) {
    return errorResponse("Não foi possível gravar o perfil.", 500);
  }

  const clientProfile = profileRowToClient(createdProfile, email);
  return respondWithVerification(account.id, email, createdProfile.artistName, clientProfile, "created");
};

export const config: Config = {
  path: "/api/dj/register",
  method: "POST",
};

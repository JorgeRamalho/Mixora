import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { djAccounts, djAcademyProgress, djProfiles, djSessions } from "../../../db/schema.js";
import {
  AUTH_CODE_TTL_MS,
  authCodeMatches,
  buildVerificationUrl,
  createAuthCode,
  hashAuthCode,
  sendPasswordResetEmail,
  sendVerificationEmail,
  VERIFICATION_TTL_MS,
} from "./email.js";
import { authCodeCooldownRemaining } from "./rate-limit.js";
import { normalizeEmail, profileRowToClient } from "./dj.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

export function createVerificationTokenValue(): string {
  return randomBytes(32).toString("hex");
}

export async function issueEmailVerification(
  accountId: string,
  email: string,
  artistName: string,
  options?: { skipCooldown?: boolean },
): Promise<{ token: string; emailSent: boolean; cooldownMs?: number; code?: string }> {
  const account = await getAccountById(accountId);
  if (!options?.skipCooldown && account) {
    const cooldownMs = authCodeCooldownRemaining(account.emailVerificationCodeExpiresAt);
    if (cooldownMs > 0) {
      return { token: account.emailVerificationToken ?? "", emailSent: false, cooldownMs };
    }
  }

  const token = createVerificationTokenValue();
  const code = createAuthCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  const now = new Date();

  await db
    .update(djAccounts)
    .set({
      emailVerified: false,
      emailVerificationToken: token,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationCodeHash: hashAuthCode(code),
      emailVerificationCodeExpiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
      emailVerifiedAt: null,
      updatedAt: now,
    })
    .where(eq(djAccounts.id, accountId));

  const sendResult = await sendVerificationEmail(email, artistName, buildVerificationUrl(token), code);
  return { token, emailSent: sendResult.sent, code };
}

export async function markEmailVerified(accountId: string): Promise<void> {
  const now = new Date();
  await db
    .update(djAccounts)
    .set({
      emailVerified: true,
      emailVerifiedAt: now,
      emailVerificationCodeHash: null,
      emailVerificationCodeExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(djAccounts.id, accountId));
}

export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<{ accountId: string; email: string } | null> {
  const account = await findAccountByEmail(email);
  if (!account?.emailVerificationCodeHash || !account.emailVerificationCodeExpiresAt) {
    return null;
  }
  if (account.emailVerificationCodeExpiresAt.getTime() <= Date.now()) {
    return null;
  }
  if (!authCodeMatches(code, account.emailVerificationCodeHash)) {
    return null;
  }

  await markEmailVerified(account.id);
  return { accountId: account.id, email: account.email };
}

export async function issuePasswordReset(
  accountId: string,
  email: string,
  artistName: string,
): Promise<{ emailSent: boolean; cooldownMs?: number; code?: string }> {
  const account = await getAccountById(accountId);
  if (account) {
    const cooldownMs = authCodeCooldownRemaining(account.passwordResetExpiresAt);
    if (cooldownMs > 0) {
      return { emailSent: false, cooldownMs };
    }
  }

  const code = createAuthCode();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);
  const now = new Date();

  await db
    .update(djAccounts)
    .set({
      passwordResetCodeHash: hashAuthCode(code),
      passwordResetExpiresAt: expiresAt,
      updatedAt: now,
    })
    .where(eq(djAccounts.id, accountId));

  const sendResult = await sendPasswordResetEmail(email, artistName, code);
  return { emailSent: sendResult.sent, code };
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  passwordHash: string,
): Promise<{ accountId: string; email: string } | null> {
  const account = await findAccountByEmail(email);
  if (!account?.passwordResetCodeHash || !account.passwordResetExpiresAt) {
    return null;
  }
  if (account.passwordResetExpiresAt.getTime() <= Date.now()) {
    return null;
  }
  if (!authCodeMatches(code, account.passwordResetCodeHash)) {
    return null;
  }

  const now = new Date();
  await db
    .update(djAccounts)
    .set({
      passwordHash,
      passwordResetCodeHash: null,
      passwordResetExpiresAt: null,
      emailVerified: true,
      emailVerifiedAt: account.emailVerifiedAt ?? now,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      emailVerificationCodeHash: null,
      emailVerificationCodeExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(djAccounts.id, account.id));

  await db.delete(djSessions).where(eq(djSessions.accountId, account.id));
  return { accountId: account.id, email: account.email };
}

export async function verifyEmailToken(token: string): Promise<{ accountId: string; email: string } | null> {
  const account = await findAccountByVerificationToken(token);
  if (!account) return null;

  const expiresAt = account.emailVerificationExpiresAt?.getTime() ?? 0;
  if (expiresAt <= Date.now()) return null;

  if (!account.emailVerified) {
    await markEmailVerified(account.id);
  }

  return { accountId: account.id, email: account.email };
}

export async function findAccountByVerificationToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const [account] = await db
    .select()
    .from(djAccounts)
    .where(eq(djAccounts.emailVerificationToken, trimmed))
    .limit(1);
  return account ?? null;
}

export function readBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(accountId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(djSessions).values({
    accountId,
    token,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function createAuthenticatedPayload(accountId: string, email: string) {
  const profile = await getProfileByAccountId(accountId);
  if (!profile) return null;

  const session = await createSession(accountId);
  return {
    ok: true as const,
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    session: {
      email,
      artistName: profile.artistName,
      loggedInAt: Date.now(),
    },
    profile: profileRowToClient(profile, email),
  };
}

export async function findAccountByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const [account] = await db
    .select()
    .from(djAccounts)
    .where(eq(djAccounts.email, normalized))
    .limit(1);
  return account ?? null;
}

export async function findValidSession(token: string) {
  const [session] = await db
    .select()
    .from(djSessions)
    .where(and(eq(djSessions.token, token), gt(djSessions.expiresAt, new Date())))
    .limit(1);
  return session ?? null;
}

export async function getProfileByAccountId(accountId: string) {
  const [profile] = await db
    .select()
    .from(djProfiles)
    .where(eq(djProfiles.accountId, accountId))
    .limit(1);
  return profile ?? null;
}

export async function getAccountById(accountId: string) {
  const [account] = await db
    .select()
    .from(djAccounts)
    .where(eq(djAccounts.id, accountId))
    .limit(1);
  return account ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(djSessions).where(eq(djSessions.token, token));
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db
    .delete(djSessions)
    .where(lt(djSessions.expiresAt, new Date()));
  return result.rowCount ?? 0;
}

export async function requireValidSession(req: Request) {
  const token = readBearerToken(req);
  if (!token) return null;
  const session = await findValidSession(token);
  if (!session) return null;
  return { token, session };
}

export async function requireVerifiedSession(req: Request) {
  const auth = await requireValidSession(req);
  if (!auth) return null;

  const account = await getAccountById(auth.session.accountId);
  if (!account) return null;
  if (!account.emailVerified) {
    return { kind: "unverified" as const, token: auth.token, session: auth.session, account };
  }

  return { kind: "verified" as const, token: auth.token, session: auth.session, account };
}

export async function getAcademyProgress(accountId: string) {
  const [row] = await db
    .select()
    .from(djAcademyProgress)
    .where(eq(djAcademyProgress.accountId, accountId))
    .limit(1);
  return row ?? null;
}

export async function upsertAcademyProgress(accountId: string, completedLessons: string[]) {
  const now = new Date();
  const [row] = await db
    .insert(djAcademyProgress)
    .values({
      accountId,
      completedLessons,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: djAcademyProgress.accountId,
      set: {
        completedLessons,
        updatedAt: now,
      },
    })
    .returning();
  return row;
}

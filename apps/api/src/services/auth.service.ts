import { UserRole, type AccessTokenClaims, type AuthPrincipal } from "../types";
import * as userRepository from "../repositories/user.repository";
import { createSession, type SessionCredentials } from "./session.service";
import type { TokenService } from "./token.service";
import { HttpError } from "../utils/http-error";

interface RegistrationInput {
  email: string;
  password: string;
  fullName: string;
}

interface LoginInput {
  email: string;
  password: string;
}

function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function registerLearner(input: RegistrationInput, tokens: TokenService): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof userRepository.findPublicById>>>;
  tokens: SessionCredentials;
}> {
  const email = input.email.trim().toLowerCase();
  let created: Awaited<ReturnType<typeof userRepository.insert>>;
  try {
    created = await userRepository.insert({
      email,
      fullName: input.fullName.trim(),
      passwordHash: await hashPassword(input.password),
      role: "Learner",
      status: "active",
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "CONFLICT", "An account with this email already exists");
    throw error;
  }
  const user = await userRepository.findPublicById(created.id);
  if (!user) throw new Error("Newly registered user could not be loaded");
  return { user, tokens: await createSession(created.id, tokens) };
}

export async function authenticateCredentials(input: LoginInput, tokens: TokenService): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof userRepository.findPublicById>>>;
  tokens: SessionCredentials;
}> {
  const user = await userRepository.findByLoginIdentifier(input.email);
  if (!user || user.status !== "active" || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, "UNAUTHORIZED", "Email or password is incorrect");
  }
  const publicUser = await userRepository.findPublicById(user.id);
  if (!publicUser) throw new HttpError(401, "UNAUTHORIZED", "Email or password is incorrect");
  return { user: publicUser, tokens: await createSession(user.id, tokens) };
}

export function getIdentityFromPrincipal(principal: AuthPrincipal): Pick<AuthPrincipal, "userId" | "role" | "issuer" | "audience" | "tokenId"> {
  return {
    userId: principal.userId,
    role: principal.role,
    issuer: principal.issuer,
    audience: principal.audience,
    tokenId: principal.tokenId,
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(401, "UNAUTHORIZED", "Current password is incorrect");
  }
  if (currentPassword === newPassword) {
    throw new HttpError(400, "INVALID_PASSWORD", "New password must differ from the current password");
  }
  const passwordHash = await hashPassword(newPassword);
  const updated = await userRepository.updatePasswordAndRevokeSessions(userId, passwordHash);
  if (!updated) throw new HttpError(404, "NOT_FOUND", "User not found");
}

export function claimsToPrincipal(claims: AccessTokenClaims): AuthPrincipal {
  if (!Object.values(UserRole).includes(claims.role) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.sub)) {
    throw new HttpError(401, "UNAUTHORIZED", "Access token is invalid");
  }
  return {
    userId: claims.sub,
    role: claims.role,
    issuer: claims.iss,
    audience: claims.aud,
    tokenId: claims.jti,
  };
}

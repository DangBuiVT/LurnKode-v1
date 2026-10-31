import { randomUUID } from "node:crypto";
import type { RefreshSession } from "../db";
import * as sessionRepository from "../repositories/session.repository";
import { findById } from "../repositories/user.repository";
import type { TokenService } from "./token.service";
import { createOpaqueRefreshToken, hashRefreshToken } from "./token.service";
import { HttpError } from "../utils/http-error";
import type { UserRole } from "../types";

export interface SessionCredentials {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export async function createSession(userId: string, tokens: TokenService, familyId = randomUUID()): Promise<SessionCredentials> {
  const user = await findById(userId);
  if (!user || user.status !== "active") {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication failed");
  }
  const accessToken = await tokens.issueAccessToken({ id: user.id, role: user.role as UserRole });
  const refreshToken = createOpaqueRefreshToken();
  const expiresAt = new Date(Date.now() + tokens.refreshTokenTtlSeconds * 1000);
  await sessionRepository.insertRefreshSession({
    userId,
    familyId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt,
  });
  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: tokens.accessTokenTtlSeconds,
  };
}

export async function rotateSession(rawRefreshToken: string, tokens: TokenService): Promise<SessionCredentials> {
  const record = await sessionRepository.findByTokenHash(hashRefreshToken(rawRefreshToken));
  if (!record) throw new HttpError(401, "UNAUTHORIZED", "Refresh credential is invalid");

  if (record.consumedAt || record.revokedAt) {
    await sessionRepository.revokeFamily(record.familyId, "refresh_token_reuse");
    throw new HttpError(401, "UNAUTHORIZED", "Refresh credential is invalid");
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    await sessionRepository.revokeSession(record.id, "expired");
    throw new HttpError(401, "UNAUTHORIZED", "Refresh credential is invalid");
  }

  const user = await findById(record.userId);
  if (!user || user.status !== "active") {
    await sessionRepository.revokeFamily(record.familyId, "account_unavailable");
    throw new HttpError(401, "UNAUTHORIZED", "Refresh credential is invalid");
  }

  const accessToken = await tokens.issueAccessToken({ id: user.id, role: user.role as UserRole });
  const refreshToken = createOpaqueRefreshToken();
  const replacement = {
    userId: record.userId,
    familyId: record.familyId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + tokens.refreshTokenTtlSeconds * 1000),
  };
  const rotated = await sessionRepository.consumeAndRotate(record.id, replacement);
  if (!rotated) {
    // A parallel refresh won the compare-and-set; invalidate its replacement as a replay response.
    await sessionRepository.revokeFamily(record.familyId, "refresh_token_reuse");
    throw new HttpError(401, "UNAUTHORIZED", "Refresh credential is invalid");
  }

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: tokens.accessTokenTtlSeconds,
  };
}

export async function revokeSession(rawRefreshToken: string, userId?: string): Promise<boolean> {
  const record = await sessionRepository.findByTokenHash(hashRefreshToken(rawRefreshToken));
  if (!record || (userId !== undefined && record.userId !== userId)) return false;
  return sessionRepository.revokeSession(record.id, "logout");
}

export async function revokeSessionFamily(familyId: string, reason: string): Promise<number> {
  return sessionRepository.revokeFamily(familyId, reason);
}

export async function revokeAllUserSessions(userId: string, reason: string): Promise<number> {
  return sessionRepository.revokeAllForUser(userId, reason);
}

export function detectRefreshTokenReuse(tokenRecord: RefreshSession): boolean {
  return tokenRecord.consumedAt !== null || tokenRecord.revokedAt !== null;
}

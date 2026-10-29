/**
 * Unit tests cho session.service.ts — Layer 4
 *
 * Yêu cầu: mock repositories để tránh DB thật.
 * Test tập trung vào business logic rotation và reuse detection.
 */
import { describe, it } from "bun:test";

describe("createSession", () => {
  it.todo("inserts a new refresh session record with tokenHash");
  it.todo("stores familyId as a new UUID");
  it.todo("expiresAt is approximately now + REFRESH_TOKEN_TTL");
  it.todo("returns the raw opaque token (not the hash)");
  it.todo("does not log the raw token");
});

describe("rotateSession", () => {
  it.todo("consumes the old session and creates a new one atomically");
  it.todo("returns new access token and new refresh token");
  it.todo("new session shares the same familyId");
  it.todo("old session is marked consumed after rotation");
  it.todo("throws if session is not found");
  it.todo("throws if session is already consumed — triggers reuse detection");
  it.todo("throws if session is already revoked");
  it.todo("throws if session is expired");
});

describe("revokeSession", () => {
  it.todo("marks the target session as revoked");
  it.todo("does not affect other sessions of the same user");
  it.todo("does not throw if session is already revoked (idempotent)");
});

describe("revokeSessionFamily", () => {
  it.todo("revokes all sessions sharing the same familyId");
  it.todo("does not revoke sessions of other families");
  it.todo("records the revocation reason");
});

describe("revokeAllUserSessions", () => {
  it.todo("revokes every active session for the user");
  it.todo("can be triggered by password change");
  it.todo("can be triggered by account lock");
  it.todo("records the revocation reason");
});

describe("detectRefreshTokenReuse", () => {
  it.todo("returns false for a valid unconsumed session");
  it.todo("returns true when the session record is already consumed");
  it.todo("triggers family revocation on reuse detection");
});


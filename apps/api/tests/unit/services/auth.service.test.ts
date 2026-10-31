/**
 * Unit tests cho auth.service.ts — Layer 4
 *
 * Yêu cầu: mock userRepository, sessionService, tokenService.
 * Không cần DB thật. Tất cả dependencies được inject qua mock.
 */
import { describe, it } from "bun:test";

describe("registerLearner", () => {
  it.todo("creates a new user with role Learner");
  it.todo("hashes the password before storing");
  it.todo("does not store plaintext password");
  it.todo("throws CONFLICT on duplicate email");
  it.todo("error message for duplicate email does not distinguish from other errors (timing-safe)");
  it.todo("ignores any role field in the input");
  it.todo("returns public user profile (no passwordHash)");
});

describe("authenticateCredentials", () => {
  it.todo("returns tokens for valid email and password");
  it.todo("throws generic error for non-existent email — same message as wrong password");
  it.todo("throws generic error for wrong password — same message as non-existent email");
  it.todo("throws if account is locked");
  it.todo("does not return password hash in success response");
  it.todo("issued access token contains correct userId and role");
});

describe("getIdentityFromPrincipal", () => {
  it.todo("returns userId and role from verified principal");
  it.todo("does not add extra claims beyond what the token contains");
  it.todo("throws if principal is null or missing userId");
});

describe("changePassword", () => {
  it.todo("updates password hash when current password is correct");
  it.todo("throws if current password is wrong");
  it.todo("revokes all refresh sessions after password change");
  it.todo("does not log new or old password");
  it.todo("new password is stored as hash, not plaintext");
});


/**
 * Unit tests cho user.service.ts — Layer 4
 *
 * Yêu cầu: mock userRepository, sessionRepository.
 * Test tập trung vào authorization logic và safe projection.
 */
import { describe, it } from "bun:test";

describe("getProfile", () => {
  it.todo("returns public user fields for the requesting user");
  it.todo("does NOT return passwordHash, refreshSessions or internal fields");
  it.todo("throws NOT_FOUND if userId does not exist");
});

describe("updateOwnProfile", () => {
  it.todo("updates only allowlisted fields (fullName, avatarUrl)");
  it.todo("rejects attempts to change role via profile endpoint");
  it.todo("rejects attempts to change status via profile endpoint");
  it.todo("rejects attempts to change email to a duplicate");
  it.todo("returns updated public profile");
});

describe("listUsers", () => {
  it.todo("returns paginated list of users for Admin");
  it.todo("excludes passwordHash from every record");
  it.todo("applies page and limit correctly");
  it.todo("throws FORBIDDEN if caller is not Admin");
});

describe("createManagedUser", () => {
  it.todo("Admin can create Learner, Instructor and Admin accounts");
  it.todo("Instructor cannot call this endpoint");
  it.todo("Learner cannot call this endpoint");
  it.todo("hashes the initial password");
  it.todo("throws CONFLICT on duplicate email");
});

describe("changeUserRole", () => {
  it.todo("Admin can promote Learner to Instructor");
  it.todo("Admin can promote Instructor to Admin");
  it.todo("cannot remove the last Admin — throws CONFLICT");
  it.todo("non-Admin caller throws FORBIDDEN");
  it.todo("throws NOT_FOUND for unknown userId");
});

describe("changeUserStatus", () => {
  it.todo("Admin can lock an active user");
  it.todo("Admin can unlock a locked user");
  it.todo("locking a user revokes all their refresh sessions");
  it.todo("cannot lock the last Admin");
  it.todo("non-Admin caller throws FORBIDDEN");
  it.todo("throws NOT_FOUND for unknown userId");
});


import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import {
  changePasswordBodySchema,
  identityResponseSchema,
  loginBodySchema,
  refreshCredentialSchema,
  registerBodySchema,
} from "@/schemas/auth.schema";
import {
  changeRoleBodySchema,
  changeStatusBodySchema,
  createUserBodySchema,
  listUsersQuerySchema,
  patchMyProfileBodySchema,
  userProfileResponseSchema,
} from "@/schemas/user.schema";
import { UserRole } from "@/types";

describe("Auth Schemas", () => {
  describe("registerBodySchema", () => {
    it("accepts valid registration payload", () => {
      const valid = {
        email: "student@example.com",
        password: "securePassword123",
        fullName: "John Doe",
      };
      expect(Value.Check(registerBodySchema, valid)).toBe(true);
    });

    it("rejects invalid email format", () => {
      const invalid = {
        email: "not-an-email",
        password: "securePassword123",
        fullName: "John Doe",
      };
      expect(Value.Check(registerBodySchema, invalid)).toBe(false);
    });

    it("rejects password shorter than 8 characters", () => {
      const invalid = {
        email: "student@example.com",
        password: "short",
        fullName: "John Doe",
      };
      expect(Value.Check(registerBodySchema, invalid)).toBe(false);
    });

    it("rejects unknown extra properties", () => {
      const invalid = {
        email: "student@example.com",
        password: "securePassword123",
        fullName: "John Doe",
        unknownField: "hack",
      };
      expect(Value.Check(registerBodySchema, invalid)).toBe(false);
    });
  });

  describe("loginBodySchema", () => {
    it("accepts valid login payload", () => {
      const valid = { email: "user@example.com", password: "p" };
      expect(Value.Check(loginBodySchema, valid)).toBe(true);
    });

    it("rejects empty password", () => {
      const invalid = { email: "user@example.com", password: "" };
      expect(Value.Check(loginBodySchema, invalid)).toBe(false);
    });
  });

  describe("refreshCredentialSchema", () => {
    it("accepts valid token string", () => {
      const valid = "a".repeat(64);
      expect(Value.Check(refreshCredentialSchema, valid)).toBe(true);
    });

    it("rejects token that is too short", () => {
      const invalid = "too-short";
      expect(Value.Check(refreshCredentialSchema, invalid)).toBe(false);
    });
  });

  describe("changePasswordBodySchema", () => {
    it("accepts valid password change request", () => {
      const valid = { currentPassword: "oldPassword", newPassword: "newSecurePassword123" };
      expect(Value.Check(changePasswordBodySchema, valid)).toBe(true);
    });

    it("rejects new password under 8 chars", () => {
      const invalid = { currentPassword: "oldPassword", newPassword: "123" };
      expect(Value.Check(changePasswordBodySchema, invalid)).toBe(false);
    });
  });

  describe("identityResponseSchema", () => {
    it("validates identity contract", () => {
      const valid = {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        role: UserRole.Learner,
        issuer: "https://auth.lurnkode.local",
        audience: "lurnkode-api",
        tokenId: "token-uuid-123",
      };
      expect(Value.Check(identityResponseSchema, valid)).toBe(true);
    });
  });
});

describe("User Schemas", () => {
  describe("patchMyProfileBodySchema", () => {
    it("accepts partial profile fields", () => {
      expect(Value.Check(patchMyProfileBodySchema, { fullName: "Jane" })).toBe(true);
      expect(Value.Check(patchMyProfileBodySchema, { avatarUrl: "https://example.com/avatar.png" })).toBe(true);
      expect(Value.Check(patchMyProfileBodySchema, { avatarUrl: null })).toBe(true);
    });

    it("rejects empty object (minProperties: 1)", () => {
      expect(Value.Check(patchMyProfileBodySchema, {})).toBe(false);
    });

    it("rejects unknown extra properties", () => {
      expect(Value.Check(patchMyProfileBodySchema, { unknownField: "bad" })).toBe(false);
    });
  });

  describe("createUserBodySchema", () => {
    it("accepts valid admin create user payload", () => {
      const valid = {
        email: "instructor@example.com",
        fullName: "Dr. Smith",
        password: "password123",
        role: UserRole.Instructor,
      };
      expect(Value.Check(createUserBodySchema, valid)).toBe(true);
    });

    it("rejects invalid role", () => {
      const invalid = {
        email: "instructor@example.com",
        fullName: "Dr. Smith",
        password: "password123",
        role: "SuperAdmin",
      };
      expect(Value.Check(createUserBodySchema, invalid)).toBe(false);
    });
  });

  describe("changeRoleBodySchema & changeStatusBodySchema", () => {
    it("validates role enum", () => {
      expect(Value.Check(changeRoleBodySchema, { role: UserRole.Admin })).toBe(true);
      expect(Value.Check(changeRoleBodySchema, { role: "Owner" })).toBe(false);
    });

    it("validates status enum", () => {
      expect(Value.Check(changeStatusBodySchema, { status: "active" })).toBe(true);
      expect(Value.Check(changeStatusBodySchema, { status: "locked" })).toBe(true);
      expect(Value.Check(changeStatusBodySchema, { status: "deleted" })).toBe(false);
    });
  });

  describe("listUsersQuerySchema", () => {
    it("accepts valid query parameters", () => {
      const valid = {
        page: 1,
        limit: 20,
        search: "Alice",
        role: UserRole.Learner,
        status: "active" as const,
      };
      expect(Value.Check(listUsersQuerySchema, valid)).toBe(true);
    });

    it("rejects non-integer limit", () => {
      expect(Value.Check(listUsersQuerySchema, { limit: 1.5 })).toBe(false);
    });

    it("rejects page less than 1", () => {
      expect(Value.Check(listUsersQuerySchema, { page: 0 })).toBe(false);
    });
  });
});


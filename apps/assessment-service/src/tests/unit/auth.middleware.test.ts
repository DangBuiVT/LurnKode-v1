import { describe, it, expect } from "vitest";
import { verifyInternalToken, extractUserContext } from "../../middlewares/auth.middleware";
import { env } from "../../config/env";

describe("auth.middleware", () => {
  describe("verifyInternalToken", () => {
    it("accepts X-Internal-Service-Key from Web API Headers", () => {
      const headers = new Headers();
      headers.set("X-Internal-Service-Key", env.INTERNAL_SERVICE_TOKEN);
      expect(verifyInternalToken(headers)).toBe(true);
    });

    it("accepts X-Internal-Token from Web API Headers", () => {
      const headers = new Headers();
      headers.set("X-Internal-Token", env.INTERNAL_SERVICE_TOKEN);
      expect(verifyInternalToken(headers)).toBe(true);
    });

    it("accepts x-internal-service-key from plain object (Elysia)", () => {
      const headers = { "x-internal-service-key": env.INTERNAL_SERVICE_TOKEN };
      expect(verifyInternalToken(headers)).toBe(true);
    });

    it("accepts x-internal-token from plain object (Elysia)", () => {
      const headers = { "x-internal-token": env.INTERNAL_SERVICE_TOKEN };
      expect(verifyInternalToken(headers)).toBe(true);
    });

    it("accepts capitalized headers from plain object", () => {
      const headers = { "X-Internal-Service-Key": env.INTERNAL_SERVICE_TOKEN };
      expect(verifyInternalToken(headers)).toBe(true);
    });

    it("rejects invalid token", () => {
      const headers = { "x-internal-service-key": "wrong_secret" };
      expect(verifyInternalToken(headers)).toBe(false);
    });

    it("rejects missing headers", () => {
      expect(verifyInternalToken({})).toBe(false);
      expect(verifyInternalToken(new Headers())).toBe(false);
    });
  });

  describe("extractUserContext", () => {
    it("extracts context with learner role", () => {
      const headers = {
        "x-user-id": "user_123",
        "x-user-role": "learner",
        "x-correlation-id": "trace_abc",
      };
      const context = extractUserContext(headers);
      expect(context).toEqual({
        userId: "user_123",
        role: "learner",
        correlationId: "trace_abc",
      });
    });

    it("extracts context with student role", () => {
      const headers = new Headers({
        "X-User-Id": "user_456",
        "X-User-Role": "student",
      });
      const context = extractUserContext(headers);
      expect(context).toEqual({
        userId: "user_456",
        role: "student",
        correlationId: undefined,
      });
    });

    it("returns null when required headers are missing", () => {
      expect(extractUserContext({})).toBeNull();
      expect(extractUserContext({ "x-user-id": "u1" })).toBeNull();
      expect(extractUserContext({ "x-user-role": "admin" })).toBeNull();
    });
  });
});

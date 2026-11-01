import { beforeAll, describe, expect, it } from "bun:test";
import { createApp } from "@/app";

describe("Auth Routes (Layer 5)", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
  });

  describe("POST /api/v1/auth/register", () => {
    it("returns 422 with VALIDATION_ERROR on empty payload", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      );

      expect(res.status).toBe(422);
      const body = await res.json() as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 on invalid email format", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "invalid-email-address",
            password: "password123",
            fullName: "Student",
          }),
        }),
      );

      expect(res.status).toBe(422);
      const body = await res.json() as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 on short password", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "valid@example.com",
            password: "123",
            fullName: "Student",
          }),
        }),
      );

      expect(res.status).toBe(422);
      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("returns 422 on missing password", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "user@example.com" }),
        }),
      );

      expect(res.status).toBe(422);
      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns 401 UNAUTHORIZED when Authorization header is absent", async () => {
      const res = await app.handle(new Request("http://localhost/api/v1/auth/me"));
      expect(res.status).toBe(401);
      const body = await res.json() as { success: boolean; error: { code: string; message: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("Authentication is required");
    });

    it("returns 401 UNAUTHORIZED on invalid token string", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/auth/me", {
          headers: { Authorization: "Bearer bogus-token-data" },
        }),
      );
      expect(res.status).toBe(401);
      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("returns 401 UNAUTHORIZED when no refresh credential is provided", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      );
      expect(res.status).toBe(401);
      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("returns 401 UNAUTHORIZED when caller is not authenticated", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "a".repeat(64) }),
        }),
      );
      expect(res.status).toBe(401);
      const body = await res.json() as { error: { code: string } };
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("PATCH /api/v1/auth/password", () => {
    it("returns 401 UNAUTHORIZED when unauthenticated", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/auth/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: "old", newPassword: "newPassword123" }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 422 VALIDATION_ERROR on short new password", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/auth/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: "oldPassword123", newPassword: "123" }),
        }),
      );
      expect(res.status).toBe(422);
    });
  });
});

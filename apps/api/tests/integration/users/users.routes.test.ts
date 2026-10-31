import { beforeAll, describe, expect, it } from "bun:test";
import { createApp } from "@/app";

describe("Users Routes (Layer 5)", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
  });

  describe("GET /api/v1/users/me", () => {
    it("returns 401 UNAUTHORIZED when Authorization header is absent", async () => {
      const res = await app.handle(new Request("http://localhost/api/v1/users/me"));
      expect(res.status).toBe(401);
      const body = await res.json() as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("PATCH /api/v1/users/me", () => {
    it("returns 401 UNAUTHORIZED when unauthenticated", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: "New Name" }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 422 VALIDATION_ERROR on empty payload", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("GET /api/v1/users (Admin only)", () => {
    it("returns 401 UNAUTHORIZED when unauthenticated", async () => {
      const res = await app.handle(new Request("http://localhost/api/v1/users"));
      expect(res.status).toBe(401);
    });

    it("rejects unauthenticated requests even with query params", async () => {
      const res = await app.handle(new Request("http://localhost/api/v1/users?limit=500"));
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/users (Admin only)", () => {
    it("returns 401 UNAUTHORIZED when unauthenticated", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "teacher@example.com",
            fullName: "Teacher",
            password: "password123",
            role: "Instructor",
          }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 422 on invalid role value", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "teacher@example.com",
            fullName: "Teacher",
            password: "password123",
            role: "NotARole",
          }),
        }),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("PATCH /api/v1/users/:id/role", () => {
    it("returns 401 UNAUTHORIZED when unauthenticated", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/users/550e8400-e29b-41d4-a716-446655440000/role", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "Admin" }),
        }),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/v1/users/:id/status", () => {
    it("returns 401 UNAUTHORIZED when unauthenticated", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/v1/users/550e8400-e29b-41d4-a716-446655440000/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "locked" }),
        }),
      );
      expect(res.status).toBe(401);
    });
  });
});

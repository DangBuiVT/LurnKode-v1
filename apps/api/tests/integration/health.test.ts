import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { healthRoutes } from "@/routes/health.routes";

/**
 * Integration test cho /health endpoint.
 * Dùng Elysia's .handle() — không cần khởi động HTTP server thực,
 * không cần database connection.
 */
const app = new Elysia().use(healthRoutes);

describe("GET /health", () => {
  it("returns 200 OK", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
  });

  it("returns status: ok", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("ok");
  });

  it("returns Content-Type application/json", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("accepts GET method only — other methods return non-200", async () => {
    const res = await app.handle(
      new Request("http://localhost/health", { method: "POST" }),
    );
    expect(res.status).not.toBe(200);
  });

  it("does not require Authorization header", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { errorHandlerPlugin } from "@/plugins/error-handler";

/** Minimal test app — error handler only, no DB dependency */
function makeApp() {
  return new Elysia()
    .use(errorHandlerPlugin())
    .get("/ok", () => ({ hello: "world" }))
    .get("/custom-conflict", () => {
      const err = Object.assign(new Error("Email already in use"), {
        code: "CONFLICT",
        status: 409,
      });
      throw err;
    })
    .get("/custom-unauthorized", () => {
      const err = Object.assign(new Error("Token expired"), {
        code: "UNAUTHORIZED",
        status: 401,
      });
      throw err;
    })
    .get("/custom-forbidden", () => {
      const err = Object.assign(new Error("Insufficient role"), {
        code: "FORBIDDEN",
        status: 403,
      });
      throw err;
    })
    .get("/unhandled-500", () => {
      throw new Error("Something exploded internally");
    });
}

const app = makeApp();

describe("errorHandlerPlugin", () => {
  it("does not interfere with successful responses", async () => {
    const res = await app.handle(new Request("http://localhost/ok"));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.hello).toBe("world");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.handle(new Request("http://localhost/no-such-route"));
    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("maps custom CONFLICT error to 409", async () => {
    const res = await app.handle(new Request("http://localhost/custom-conflict"));
    expect(res.status).toBe(409);
    const body = await res.json() as { success: boolean; error: { code: string; message: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.message).toBe("Email already in use");
  });

  it("maps custom UNAUTHORIZED error to 401", async () => {
    const res = await app.handle(new Request("http://localhost/custom-unauthorized"));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("maps custom FORBIDDEN error to 403", async () => {
    const res = await app.handle(new Request("http://localhost/custom-forbidden"));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("maps unhandled error to 500 and hides internal message", async () => {
    const res = await app.handle(new Request("http://localhost/unhandled-500"));
    expect(res.status).toBe(500);
    const body = await res.json() as { success: boolean; error: { code: string; message: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
    // Internal error message must NOT be exposed to client
    expect(body.error.message).not.toContain("exploded");
    expect(body.error.message).toBe("An unexpected error occurred");
  });

  it("response always has success: false for errors", async () => {
    const res = await app.handle(new Request("http://localhost/no-such-route"));
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("error response has stable error.code string", async () => {
    const res = await app.handle(new Request("http://localhost/no-such-route"));
    const body = await res.json() as { error: { code: unknown } };
    expect(typeof body.error.code).toBe("string");
    expect(/^[A-Z][A-Z0-9_]*$/.test(body.error.code as string)).toBe(true);
  });
});

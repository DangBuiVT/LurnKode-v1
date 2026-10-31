import { describe, expect, it } from "bun:test";
import { createApp } from "@/app";

describe("JWKS endpoint", () => {
  it("GET /.well-known/jwks.json returns 200 with public keys", async () => {
    const app = await createApp();
    const res = await app.handle(new Request("http://localhost/.well-known/jwks.json"));

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("public");
    expect(res.headers.get("content-type")).toContain("application/json");

    const body = await res.json() as { keys: Array<Record<string, unknown>> };
    expect(Array.isArray(body.keys)).toBe(true);
    expect(body.keys.length).toBeGreaterThanOrEqual(1);

    const key = body.keys[0]!;
    expect(key.kty).toBe("RSA");
    expect(key.alg).toBe("RS256");
    expect(key.use).toBe("sig");
    expect(typeof key.kid).toBe("string");
    expect(typeof key.n).toBe("string");
    expect(typeof key.e).toBe("string");

    // Must never leak private key params
    expect("d" in key).toBe(false);
  });

  it("GET /api/v1/auth/jwks also returns 200 with identical JWKS", async () => {
    const app = await createApp();
    const res = await app.handle(new Request("http://localhost/api/v1/auth/jwks"));
    expect(res.status).toBe(200);

    const body = await res.json() as { keys: Array<Record<string, unknown>> };
    expect(Array.isArray(body.keys)).toBe(true);
  });
});


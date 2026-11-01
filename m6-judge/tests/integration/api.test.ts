import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import postgres from "postgres";
import { createApp } from "../../src/api/app";
import { createStore } from "../../src/db/store";
import { DATABASE_URL, makeRequest, resetDb, testSql } from "./helpers";

let sql: postgres.Sql;
let app: ReturnType<typeof createApp>;

const TOKENS = [
  { id: "m3", token: "m3-secret", scopes: ["submit", "read"] },
  { id: "ops", token: "ops-secret", scopes: ["read"] },
];

beforeAll(async () => {
  sql = await testSql();
  app = createApp({ store: createStore(sql), tokens: TOKENS, rateLimitPerMin: 1000 });
});
beforeEach(() => resetDb(sql));
afterAll(() => sql.end());

const post = (body: unknown, headers: Record<string, string> = {}, a = app) =>
  a.handle(
    new Request("http://localhost/internal/v1/judge-submissions", {
      method: "POST",
      headers: {
        authorization: "Bearer m3-secret",
        "idempotency-key": crypto.randomUUID(),
        "content-type": "application/json",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const get = (id: string, token = "m3-secret") =>
  app.handle(new Request(`http://localhost/internal/v1/judge-submissions/${id}`, { headers: { authorization: `Bearer ${token}` } }));

describe("auth", () => {
  it("should return 401 UNAUTHENTICATED_SERVICE without credentials", async () => {
    const res = await app.handle(
      new Request("http://localhost/internal/v1/judge-submissions", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED_SERVICE");
  });

  it("should return 401 for a wrong token", async () => {
    const res = await post(makeRequest(), { authorization: "Bearer nope" });
    expect(res.status).toBe(401);
  });

  it("should return 403 SERVICE_NOT_ALLOWED when the service lacks the submit scope", async () => {
    const res = await post(makeRequest(), { authorization: "Bearer ops-secret" });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("SERVICE_NOT_ALLOWED");
  });
});

describe("POST /internal/v1/judge-submissions", () => {
  it("should accept a valid submission with 202 and never touch the queue synchronously", async () => {
    const req = makeRequest();
    const res = await post(req, { "x-trace-id": "11111111-1111-4111-8111-111111111111" });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toMatchObject({
      contractVersion: "1.0",
      clientSubmissionId: req.clientSubmissionId,
      status: "queued",
      traceId: "11111111-1111-4111-8111-111111111111",
    });
    expect(body.judgeSubmissionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(body.acceptedAt).getTime()).not.toBeNaN();
    const [o] = await sql`SELECT kind, state FROM judge_outbox`;
    expect(o).toMatchObject({ kind: "enqueue", state: "pending" });
  });

  it("should generate a trace id when none is given and echo it as a header", async () => {
    const res = await post(makeRequest());
    expect(res.headers.get("x-trace-id")).toBeTruthy();
    expect((await res.json()).traceId).toBe(res.headers.get("x-trace-id"));
  });

  it("should replay an identical request with 200 + Idempotent-Replay and the same id", async () => {
    const req = makeRequest();
    const key = "replay-key";
    const a = await post(req, { "idempotency-key": key });
    const b = await post(req, { "idempotency-key": key });
    expect(a.status).toBe(202);
    expect(b.status).toBe(200);
    expect(b.headers.get("idempotent-replay")).toBe("true");
    expect((await b.json()).judgeSubmissionId).toBe((await a.json()).judgeSubmissionId);
  });

  it("should replay regardless of JSON key order", async () => {
    const req = makeRequest();
    const reordered = JSON.parse(JSON.stringify(req));
    const flipped = Object.fromEntries(Object.entries(reordered).reverse());
    await post(req, { "idempotency-key": "k-order" });
    const b = await post(flipped, { "idempotency-key": "k-order" });
    expect(b.status).toBe(200);
  });

  it("should return 409 IDEMPOTENCY_KEY_REUSED for same key with a different payload", async () => {
    await post(makeRequest(), { "idempotency-key": "same" });
    const res = await post(makeRequest(), { "idempotency-key": "same" });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("should return 409 CLIENT_SUBMISSION_ALREADY_EXISTS for a new key and the same clientSubmissionId", async () => {
    const req = makeRequest();
    await post(req, { "idempotency-key": "a" });
    const res = await post(req, { "idempotency-key": "b" });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("CLIENT_SUBMISSION_ALREADY_EXISTS");
  });

  it("should return 400 when the Idempotency-Key header is missing", async () => {
    const res = await post(makeRequest(), { "idempotency-key": "" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("should return 400 for malformed JSON", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
  });

  it("should return 422 UNSUPPORTED_LANGUAGE with the standard error envelope and no source echo", async () => {
    const res = await post(makeRequest({ language: "brainfuck" as never, sourceCode: "SECRET_SOURCE" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatchObject({ code: "UNSUPPORTED_LANGUAGE", retryable: false });
    expect(body.error.traceId).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain("SECRET_SOURCE");
  });

  it("should return 413 PAYLOAD_TOO_LARGE for oversized source", async () => {
    const res = await post(makeRequest({ sourceCode: "a".repeat(70_000) }));
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("should return 413 before buffering when content-length is huge", async () => {
    const res = await post("{}", { "content-length": String(50 * 1024 * 1024) });
    expect(res.status).toBe(413);
  });

  it("should return 422 LIMIT_EXCEEDS_POLICY when requested limits exceed policy", async () => {
    const res = await post(makeRequest({ requestedRuntimeLimits: { cpuCores: 1, memoryLimitMb: 1024, timeLimitMs: 3000 } }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("LIMIT_EXCEEDS_POLICY");
  });

  it("should apply server-side limits and store them with the submission", async () => {
    const res = await post(makeRequest({ requestedRuntimeLimits: { memoryLimitMb: 64 } }));
    const { judgeSubmissionId } = await res.json();
    const [s] = await sql`SELECT limits FROM judge_submissions WHERE id=${judgeSubmissionId}`;
    expect(s!.limits).toEqual({ cpuCores: 1, memoryLimitMb: 64, timeLimitMs: 3000 });
  });

  it("should create exactly one submission under concurrent identical posts", async () => {
    const req = makeRequest();
    const rs = await Promise.all(Array.from({ length: 6 }, () => post(req, { "idempotency-key": "conc" })));
    expect(rs.filter((r) => r.status === 202)).toHaveLength(1);
    expect(rs.filter((r) => r.status === 200)).toHaveLength(5);
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM judge_submissions`) as unknown as [{ n: number }];
    expect(n).toBe(1);
  });

  it("should return 503 DEPENDENCY_UNAVAILABLE (retryable) when the database is down", async () => {
    const dead = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
    await dead.end();
    const a = createApp({ store: createStore(dead), tokens: TOKENS, rateLimitPerMin: 1000 });
    const res = await post(makeRequest(), {}, a);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatchObject({ code: "DEPENDENCY_UNAVAILABLE", retryable: true });
  });

  it("should return 429 RATE_LIMITED with Retry-After beyond the per-caller limit", async () => {
    const a = createApp({ store: createStore(sql), tokens: TOKENS, rateLimitPerMin: 2 });
    const rs = [];
    for (let i = 0; i < 3; i++) rs.push(await post(makeRequest(), {}, a));
    expect(rs.map((r) => r.status)).toEqual([202, 202, 429]);
    expect(rs[2]!.headers.get("retry-after")).toBeTruthy();
    expect((await rs[2]!.json()).error.code).toBe("RATE_LIMITED");
  });
});

describe("GET /internal/v1/judge-submissions/:id", () => {
  it("should return status without source, tests or expected outputs", async () => {
    const req = makeRequest({ sourceCode: "SECRET_SOURCE" });
    const { judgeSubmissionId } = await (await post(req)).json();
    const res = await get(judgeSubmissionId);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain("SECRET_SOURCE");
    expect(text).not.toContain("expectedOutput");
    expect(JSON.parse(text)).toMatchObject({ judgeSubmissionId, clientSubmissionId: req.clientSubmissionId, status: "queued" });
  });

  it("should allow read-only services and reject unauthenticated callers", async () => {
    const { judgeSubmissionId } = await (await post(makeRequest())).json();
    expect((await get(judgeSubmissionId, "ops-secret")).status).toBe(200);
    expect((await get(judgeSubmissionId, "bad")).status).toBe(401);
  });

  it("should return 404 for unknown ids and 400 for malformed ids", async () => {
    expect((await get(crypto.randomUUID())).status).toBe(404);
    expect((await get("not-a-uuid")).status).toBe(400);
  });

  it("should expose the verdict once completed", async () => {
    const store = createStore(sql);
    const { judgeSubmissionId } = await (await post(makeRequest())).json();
    await store.claimSubmission(judgeSubmissionId);
    await store.completeSubmission(judgeSubmissionId, {
      executionStatus: "completed",
      verdict: "WA",
      summary: { totalTests: 1, passedTests: 0, failedTests: 1 },
      metrics: { runtimeMs: 5 },
      diagnostics: { compileMessage: null },
      events: [],
    });
    const body = await (await get(judgeSubmissionId)).json();
    expect(body).toMatchObject({ status: "completed", verdict: "WA" });
    expect(body.finishedAt).toBeTruthy();
  });
});

describe("health", () => {
  it("should answer GET /health without auth", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
  });
});

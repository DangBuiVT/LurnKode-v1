import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import type postgres from "postgres";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { createStore, type Store } from "../../src/db/store";
import { canonicalHash } from "../../src/domain/hash";
import { clampLimits } from "../../src/domain/limits";
import { dispatchCallbacks, dispatchEnqueue } from "../../src/dispatcher/dispatch";
import { QUEUE_NAME } from "../../src/queue";
import { REDIS_URL, makeRequest, resetDb, testSql } from "./helpers";

let sql: postgres.Sql;
let store: Store;
let redis: IORedis;
let queue: Queue;

beforeAll(async () => {
  sql = await testSql();
  store = createStore(sql);
  redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  queue = new Queue(QUEUE_NAME, { connection: redis });
});
beforeEach(async () => {
  await resetDb(sql);
  await queue.obliterate({ force: true });
});
afterAll(async () => {
  await queue.close();
  redis.disconnect();
  await sql.end();
});

const create = async () => {
  const request = makeRequest({ sourceCode: "SECRET_SOURCE" });
  const r = await store.createSubmission({
    callerId: "m3",
    idempotencyKey: crypto.randomUUID(),
    requestHash: canonicalHash(request),
    request,
    traceId: crypto.randomUUID(),
    limits: clampLimits(undefined),
  });
  if (r.kind !== "created") throw new Error("x");
  return { id: r.submission.id, traceId: r.submission.traceId, request };
};

describe("dispatchEnqueue", () => {
  it("should enqueue ids-only payload with a stable job id and mark the outbox delivered", async () => {
    const { id, traceId } = await create();
    const n = await dispatchEnqueue({ store, queue });
    expect(n).toBe(1);
    const job = await queue.getJob(id);
    expect(job).toBeTruthy();
    expect(job!.data).toEqual({ schemaVersion: "1.0", judgeSubmissionId: id, traceId });
    expect(JSON.stringify(job!.data)).not.toContain("SECRET_SOURCE");
    const [o] = await sql`SELECT state FROM judge_outbox WHERE kind='enqueue'`;
    expect(o!.state).toBe("delivered");
  });

  it("should not create a duplicate job when dispatched twice (stable job id)", async () => {
    const { id } = await create();
    await dispatchEnqueue({ store, queue });
    await sql`UPDATE judge_outbox SET state='pending', next_attempt_at=now() WHERE kind='enqueue'`;
    await dispatchEnqueue({ store, queue });
    const counts = await queue.getJobCounts("waiting", "active", "delayed");
    expect(counts.waiting).toBe(1);
    expect((await queue.getJob(id))!.id).toBe(id);
  });

  it("should leave the row retryable when Redis enqueue fails (no loss)", async () => {
    await create();
    const broken = { add: async () => { throw new Error("redis down"); } } as unknown as Queue;
    const n = await dispatchEnqueue({ store, queue: broken });
    expect(n).toBe(0);
    const [o] = await sql`SELECT state, attempts, last_error FROM judge_outbox WHERE kind='enqueue'`;
    expect(o).toMatchObject({ state: "pending", attempts: 1 });
    expect(o!.last_error).toContain("redis down");
  });
});

// ---- callback delivery against a real local HTTP server (stands in for M3) ----
function startReceiver(statuses: number[]) {
  const seen: Array<{ headers: Headers; body: any }> = [];
  let i = 0;
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      seen.push({ headers: req.headers, body: await req.json() });
      const s = statuses[Math.min(i++, statuses.length - 1)]!;
      return new Response("{}", { status: s });
    },
  });
  return { server, seen, url: `http://localhost:${server.port}/internal/v1/judge-results` };
}

const completeOne = async () => {
  const { id } = await create();
  await store.claimSubmission(id);
  await store.completeSubmission(id, {
    executionStatus: "completed",
    verdict: "AC",
    summary: { totalTests: 1, passedTests: 1, failedTests: 0 },
    metrics: { runtimeMs: 5 },
    diagnostics: { compileMessage: null },
    events: [],
  });
  return id;
};

const deps = (url: string, token = "cb-secret") => ({
  store,
  callbackUrl: url,
  callbackToken: token,
  fetch: globalThis.fetch,
  rand: () => 0,
});

describe("dispatchCallbacks", () => {
  it("should POST the stable eventId payload with auth + Idempotency-Key and mark delivered on 2xx", async () => {
    const rx = startReceiver([200]);
    await completeOne();
    await dispatchCallbacks(deps(rx.url));
    expect(rx.seen).toHaveLength(1);
    const { headers, body } = rx.seen[0]!;
    expect(headers.get("authorization")).toBe("Bearer cb-secret");
    expect(headers.get("idempotency-key")).toBe(body.eventId);
    expect(body).toMatchObject({ contractVersion: "1.0", executionStatus: "completed", verdict: "AC" });
    expect(JSON.stringify(body)).not.toContain("SECRET_SOURCE");
    const [o] = await sql`SELECT state FROM judge_outbox WHERE kind='callback'`;
    expect(o!.state).toBe("delivered");
    rx.server.stop(true);
  });

  it("should retry transient failure with the SAME eventId and eventually deliver without losing the result", async () => {
    const rx = startReceiver([503, 200]);
    await completeOne();
    await dispatchCallbacks(deps(rx.url));
    let [o] = await sql`SELECT state, attempts FROM judge_outbox WHERE kind='callback'`;
    expect(o).toMatchObject({ state: "pending", attempts: 1 });
    await sql`UPDATE judge_outbox SET next_attempt_at = now() - interval '1 second' WHERE kind='callback'`;
    await dispatchCallbacks(deps(rx.url));
    [o] = await sql`SELECT state FROM judge_outbox WHERE kind='callback'`;
    expect(o!.state).toBe("delivered");
    expect(rx.seen).toHaveLength(2);
    expect(rx.seen[0]!.body.eventId).toBe(rx.seen[1]!.body.eventId);
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM judge_results`) as unknown as [{ n: number }];
    expect(n).toBe(1);
    rx.server.stop(true);
  });

  it("should retry on network failure", async () => {
    await completeOne();
    await dispatchCallbacks(deps("http://localhost:1/unreachable"));
    const [o] = await sql`SELECT state, attempts, last_error FROM judge_outbox WHERE kind='callback'`;
    expect(o).toMatchObject({ state: "pending", attempts: 1 });
    expect(o!.last_error).toBeTruthy();
  });

  it("should stop rapid retries on a non-retryable 4xx and keep the row as dead for operators", async () => {
    const rx = startReceiver([401]);
    await completeOne();
    await dispatchCallbacks(deps(rx.url));
    const [o] = await sql`SELECT state, last_error FROM judge_outbox WHERE kind='callback'`;
    expect(o).toMatchObject({ state: "dead" });
    expect(o!.last_error).toContain("401");
    await dispatchCallbacks(deps(rx.url));
    expect(rx.seen).toHaveLength(1);
    rx.server.stop(true);
  });

  it("should dead-letter (never delete the result) when attempts are exhausted", async () => {
    const rx = startReceiver([503]);
    await completeOne();
    await sql`UPDATE judge_outbox SET attempts = 7 WHERE kind='callback'`;
    await dispatchCallbacks(deps(rx.url));
    const [o] = await sql`SELECT state FROM judge_outbox WHERE kind='callback'`;
    expect(o!.state).toBe("dead");
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM judge_results`) as unknown as [{ n: number }];
    expect(n).toBe(1);
    rx.server.stop(true);
  });
});

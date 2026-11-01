import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import type postgres from "postgres";
import { createStore, type Store } from "../../src/db/store";
import { canonicalHash } from "../../src/domain/hash";
import { clampLimits } from "../../src/domain/limits";
import type { ExecutionOutcome } from "../../src/judge/execute";
import { makeRequest, resetDb, testSql } from "./helpers";

let sql: postgres.Sql;
let store: Store;

beforeAll(async () => {
  sql = await testSql();
  store = createStore(sql);
});
beforeEach(() => resetDb(sql));
afterAll(() => sql.end());

const create = async (over = {}, key = crypto.randomUUID()) => {
  const request = makeRequest(over);
  const r = await store.createSubmission({
    callerId: "m3",
    idempotencyKey: key,
    requestHash: canonicalHash(request),
    request,
    traceId: crypto.randomUUID(),
    limits: clampLimits(undefined),
  });
  if (r.kind !== "created") throw new Error("expected created");
  return { id: r.submission.id, request };
};

const completed: ExecutionOutcome = {
  executionStatus: "completed",
  verdict: "AC",
  summary: { totalTests: 1, passedTests: 1, failedTests: 0 },
  metrics: { runtimeMs: 120 },
  diagnostics: { compileMessage: null },
  events: [{ type: "timeout_enforced", testCaseId: "tc-001" }],
};

describe("store.createSubmission", () => {
  it("should atomically persist submission, private snapshot and an enqueue outbox row", async () => {
    const { id, request } = await create();
    const [s] = await sql`SELECT status, client_submission_id FROM judge_submissions WHERE id=${id}`;
    expect(s!.status).toBe("queued");
    expect(s!.client_submission_id).toBe(request.clientSubmissionId);
    const [snap] = await sql`SELECT source_code, judge_package FROM judge_payload_snapshots WHERE submission_id=${id}`;
    expect(snap!.source_code).toBe(request.sourceCode);
    const out = await sql`SELECT kind, state FROM judge_outbox WHERE submission_id=${id}`;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "enqueue", state: "pending" });
  });

  it("should return replay for same caller+key+hash", async () => {
    const request = makeRequest();
    const input = {
      callerId: "m3",
      idempotencyKey: "k1",
      requestHash: canonicalHash(request),
      request,
      traceId: crypto.randomUUID(),
      limits: clampLimits(undefined),
    };
    const a = await store.createSubmission(input);
    const b = await store.createSubmission(input);
    expect(a.kind).toBe("created");
    expect(b.kind).toBe("replay");
    expect(b.kind === "replay" && a.kind === "created" && b.submission.id === a.submission.id).toBe(true);
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM judge_submissions`) as unknown as [{ n: number }];
    expect(n).toBe(1);
  });

  it("should report key reuse for same key but different body", async () => {
    const r1 = makeRequest();
    const r2 = makeRequest();
    const mk = (r: typeof r1) => ({
      callerId: "m3",
      idempotencyKey: "same",
      requestHash: canonicalHash(r),
      request: r,
      traceId: crypto.randomUUID(),
      limits: clampLimits(undefined),
    });
    await store.createSubmission(mk(r1));
    expect((await store.createSubmission(mk(r2))).kind).toBe("key_reused");
  });

  it("should report client_exists for same clientSubmissionId with a different key", async () => {
    const request = makeRequest();
    const mk = (key: string) => ({
      callerId: "m3",
      idempotencyKey: key,
      requestHash: canonicalHash(request),
      request,
      traceId: crypto.randomUUID(),
      limits: clampLimits(undefined),
    });
    await store.createSubmission(mk("a"));
    expect((await store.createSubmission(mk("b"))).kind).toBe("client_exists");
  });

  it("should create exactly one row under concurrent identical requests", async () => {
    const request = makeRequest();
    const mk = () =>
      store.createSubmission({
        callerId: "m3",
        idempotencyKey: "race",
        requestHash: canonicalHash(request),
        request,
        traceId: crypto.randomUUID(),
        limits: clampLimits(undefined),
      });
    const rs = await Promise.all(Array.from({ length: 8 }, mk));
    expect(rs.filter((r) => r.kind === "created")).toHaveLength(1);
    expect(rs.filter((r) => r.kind === "replay")).toHaveLength(7);
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM judge_outbox`) as unknown as [{ n: number }];
    expect(n).toBe(1);
  });
});

describe("store.claimSubmission", () => {
  it("should let exactly one of many concurrent claimers win", async () => {
    const { id } = await create();
    const rs = await Promise.all(Array.from({ length: 6 }, () => store.claimSubmission(id)));
    expect(rs.filter(Boolean)).toHaveLength(1);
    const [s] = await sql`SELECT status, attempt_count FROM judge_submissions WHERE id=${id}`;
    expect(s).toMatchObject({ status: "running", attempt_count: 1 });
  });

  it("should return the private payload to the claimer", async () => {
    const { id, request } = await create();
    const c = await store.claimSubmission(id);
    expect(c!.sourceCode).toBe(request.sourceCode);
    expect(c!.pkg.testCases[0]!.expectedOutput).toBe("5");
    expect(c!.language).toBe("python");
  });

  it("should not claim an already completed submission", async () => {
    const { id } = await create();
    await store.claimSubmission(id);
    await store.completeSubmission(id, completed);
    expect(await store.claimSubmission(id)).toBeNull();
  });

  it("should return null for unknown ids", async () => {
    expect(await store.claimSubmission(crypto.randomUUID())).toBeNull();
  });
});

describe("store.completeSubmission", () => {
  it("should persist result, events and a callback outbox row in one go", async () => {
    const { id, request } = await create();
    await store.claimSubmission(id);
    expect(await store.completeSubmission(id, completed)).toBe(true);
    const [s] = await sql`SELECT status FROM judge_submissions WHERE id=${id}`;
    expect(s!.status).toBe("completed");
    const [r] = await sql`SELECT verdict, execution_status FROM judge_results WHERE submission_id=${id}`;
    expect(r).toMatchObject({ verdict: "AC", execution_status: "completed" });
    const ev = await sql`SELECT type FROM judge_events WHERE submission_id=${id}`;
    expect(ev.map((e) => e.type)).toContain("timeout_enforced");
    const [cb] = await sql`SELECT payload, event_id FROM judge_outbox WHERE submission_id=${id} AND kind='callback'`;
    const p = cb!.payload as Record<string, unknown>;
    expect(p).toMatchObject({
      contractVersion: "1.0",
      judgeSubmissionId: id,
      clientSubmissionId: request.clientSubmissionId,
      attemptId: request.attemptId,
      assessmentItemId: request.assessmentItemId,
      revision: 1,
      executionStatus: "completed",
      verdict: "AC",
      summary: { totalTests: 1, passedTests: 1, failedTests: 0 },
    });
    expect(p.eventId).toBe(cb!.event_id);
    expect(JSON.stringify(p)).not.toContain("print(5)");
  });

  it("should never create a second final result or callback (idempotent)", async () => {
    const { id } = await create();
    await store.claimSubmission(id);
    expect(await store.completeSubmission(id, completed)).toBe(true);
    expect(await store.completeSubmission(id, completed)).toBe(false);
    const [{ r }] = (await sql`SELECT count(*)::int AS r FROM judge_results`) as unknown as [{ r: number }];
    const [{ c }] = (await sql`SELECT count(*)::int AS c FROM judge_outbox WHERE kind='callback'`) as unknown as [{ c: number }];
    expect([r, c]).toEqual([1, 1]);
  });

  it("should store failed outcomes without any verdict", async () => {
    const { id } = await create();
    await store.claimSubmission(id);
    await store.completeSubmission(id, {
      executionStatus: "failed",
      failure: { code: "RETRY_EXHAUSTED", retryable: false },
      events: [],
    });
    const [r] = await sql`SELECT verdict, failure_code FROM judge_results WHERE submission_id=${id}`;
    expect(r).toMatchObject({ verdict: null, failure_code: "RETRY_EXHAUSTED" });
    const [cb] = await sql`SELECT payload FROM judge_outbox WHERE kind='callback'`;
    const p = cb!.payload as Record<string, unknown>;
    expect(p.executionStatus).toBe("failed");
    expect("verdict" in p).toBe(false);
    expect(p.failure).toEqual({ code: "RETRY_EXHAUSTED", retryable: false });
  });

  it("should refuse to complete a submission that is not running", async () => {
    const { id } = await create();
    expect(await store.completeSubmission(id, completed)).toBe(false);
  });
});

describe("store.requeueSubmission", () => {
  it("should move running back to queued", async () => {
    const { id } = await create();
    await store.claimSubmission(id);
    expect(await store.requeueSubmission(id)).toBe(true);
    const [s] = await sql`SELECT status FROM judge_submissions WHERE id=${id}`;
    expect(s!.status).toBe("queued");
    expect(await store.claimSubmission(id)).not.toBeNull();
  });
});

describe("outbox leasing and delivery state", () => {
  it("should lease due rows so a second dispatcher does not see them", async () => {
    await create();
    const first = await store.claimDueOutbox("enqueue", 10, 30_000);
    const second = await store.claimDueOutbox("enqueue", 10, 30_000);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it("should re-offer a row after its lease expired", async () => {
    await create();
    await store.claimDueOutbox("enqueue", 10, 1_000);
    const later = await store.claimDueOutbox("enqueue", 10, 1_000, new Date(Date.now() + 5_000));
    expect(later).toHaveLength(1);
  });

  it("should not offer delivered rows", async () => {
    await create();
    const [row] = await store.claimDueOutbox("enqueue", 10, 1_000);
    await store.markOutboxDelivered(row!.id);
    expect(await store.claimDueOutbox("enqueue", 10, 1_000, new Date(Date.now() + 60_000))).toHaveLength(0);
  });

  it("should schedule a retry in the future and count the attempt", async () => {
    await create();
    const [row] = await store.claimDueOutbox("enqueue", 10, 1_000);
    await store.markOutboxRetry(row!.id, 10_000, "http 503");
    expect(await store.claimDueOutbox("enqueue", 10, 1_000)).toHaveLength(0);
    const again = await store.claimDueOutbox("enqueue", 10, 1_000, new Date(Date.now() + 20_000));
    expect(again[0]!.attempts).toBe(1);
  });

  it("should keep dead rows for operators and never re-offer them", async () => {
    await create();
    const [row] = await store.claimDueOutbox("enqueue", 10, 1_000);
    await store.markOutboxDead(row!.id, "http 400");
    expect(await store.claimDueOutbox("enqueue", 10, 1_000, new Date(Date.now() + 60_000))).toHaveLength(0);
    const [r] = await sql`SELECT state, last_error FROM judge_outbox WHERE id=${row!.id}`;
    expect(r).toMatchObject({ state: "dead", last_error: "http 400" });
  });
});

describe("store.findStuck", () => {
  it("should find running submissions older than the threshold", async () => {
    const { id } = await create();
    await store.claimSubmission(id);
    expect(await store.findStuck(60_000)).toEqual([]);
    expect(await store.findStuck(60_000, new Date(Date.now() + 120_000))).toEqual([id]);
  });

  it("should find queued submissions with no pending or delivered enqueue work (lost)", async () => {
    const { id } = await create();
    const [row] = await store.claimDueOutbox("enqueue", 10, 1_000);
    await store.markOutboxDelivered(row!.id);
    expect(await store.findStuck(60_000, new Date(Date.now() + 120_000))).toEqual([id]);
  });
});

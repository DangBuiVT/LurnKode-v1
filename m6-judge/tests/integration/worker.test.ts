import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import type postgres from "postgres";
import { createStore, type Store } from "../../src/db/store";
import { canonicalHash } from "../../src/domain/hash";
import { clampLimits } from "../../src/domain/limits";
import { processJob, MAX_JOB_ATTEMPTS } from "../../src/worker/process";
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

const create = async () => {
  const request = makeRequest();
  const r = await store.createSubmission({
    callerId: "m3",
    idempotencyKey: crypto.randomUUID(),
    requestHash: canonicalHash(request),
    request,
    traceId: crypto.randomUUID(),
    limits: clampLimits(undefined),
  });
  if (r.kind !== "created") throw new Error("x");
  return r.submission.id;
};

const ac: ExecutionOutcome = {
  executionStatus: "completed",
  verdict: "AC",
  summary: { totalTests: 1, passedTests: 1, failedTests: 0 },
  metrics: { runtimeMs: 1 },
  diagnostics: { compileMessage: null },
  events: [],
};
const infra: ExecutionOutcome = {
  executionStatus: "failed",
  failure: { code: "SANDBOX_UNAVAILABLE", retryable: true },
  events: [{ type: "sandbox_unavailable" }],
};
const job = (id: string, attemptsMade = 0) => ({ data: { schemaVersion: "1.0", judgeSubmissionId: id, traceId: "t" }, attemptsMade });

/** Capture a rejection. (Bun's `expect(p).rejects` blocks the event loop, which stalls real DB I/O.) */
const rejection = async (p: Promise<unknown>): Promise<Error | null> => {
  try {
    await p;
    return null;
  } catch (e) {
    return e as Error;
  }
};

describe("processJob", () => {
  it("should run the submission, persist the result and queue a callback", async () => {
    const id = await create();
    const seen: unknown[] = [];
    await processJob({ store, execute: async (i) => { seen.push(i); return ac; } }, job(id));
    const [s] = await sql`SELECT status FROM judge_submissions WHERE id=${id}`;
    expect(s!.status).toBe("completed");
    expect(seen).toHaveLength(1);
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM judge_outbox WHERE kind='callback'`) as unknown as [{ n: number }];
    expect(n).toBe(1);
  });

  it("should pass the stored private snapshot and server-side limits to the executor", async () => {
    const id = await create();
    let captured: any;
    await processJob({ store, execute: async (i) => { captured = i; return ac; } }, job(id));
    expect(captured.sourceCode).toBe("print(5)");
    expect(captured.pkg.testCases[0].expectedOutput).toBe("5");
    expect(captured.limits).toEqual({ cpuCores: 1, memoryLimitMb: 128, timeLimitMs: 3000 });
  });

  it("should be a no-op for a duplicate delivery of an already-final submission", async () => {
    const id = await create();
    let runs = 0;
    const d = { store, execute: async () => { runs++; return ac; } };
    await processJob(d, job(id));
    await processJob(d, job(id));
    expect(runs).toBe(1);
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM judge_results`) as unknown as [{ n: number }];
    expect(n).toBe(1);
  });

  it("should run only once when the same job is processed concurrently", async () => {
    const id = await create();
    let runs = 0;
    const d = { store, execute: async () => { runs++; await Bun.sleep(50); return ac; } };
    await Promise.all([processJob(d, job(id)), processJob(d, job(id)), processJob(d, job(id))]);
    expect(runs).toBe(1);
  });

  it("should ignore unknown submissions without throwing", async () => {
    await processJob({ store, execute: async () => ac }, job(crypto.randomUUID()));
  });

  it("should requeue and throw on a retryable infrastructure failure (so BullMQ retries)", async () => {
    const id = await create();
    const err = await rejection(processJob({ store, execute: async () => infra }, job(id, 0)));
    expect(err?.message).toMatch(/retry/i);
    const [s] = await sql`SELECT status FROM judge_submissions WHERE id=${id}`;
    expect(s!.status).toBe("queued");
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM judge_results`) as unknown as [{ n: number }];
    expect(n).toBe(0);
  });

  it("should finish as failed/RETRY_EXHAUSTED (no verdict) when attempts run out", async () => {
    const id = await create();
    await processJob({ store, execute: async () => infra }, job(id, MAX_JOB_ATTEMPTS - 1));
    const [r] = await sql`SELECT execution_status, verdict, failure_code FROM judge_results WHERE submission_id=${id}`;
    expect(r).toMatchObject({ execution_status: "failed", verdict: null, failure_code: "RETRY_EXHAUSTED" });
    const [s] = await sql`SELECT status FROM judge_submissions WHERE id=${id}`;
    expect(s!.status).toBe("failed");
  });

  it("should finish immediately as failed for non-retryable failures", async () => {
    const id = await create();
    const bad: ExecutionOutcome = { executionStatus: "failed", failure: { code: "POLICY_CONFIGURATION_ERROR", retryable: false }, events: [] };
    await processJob({ store, execute: async () => bad }, job(id, 0));
    const [r] = await sql`SELECT failure_code FROM judge_results WHERE submission_id=${id}`;
    expect(r!.failure_code).toBe("POLICY_CONFIGURATION_ERROR");
  });

  it("should treat an executor crash as a retryable worker failure, never as WA", async () => {
    const id = await create();
    const err = await rejection(processJob({ store, execute: async () => { throw new Error("boom"); } }, job(id, 0)));
    expect(err).not.toBeNull();
    const [s] = await sql`SELECT status FROM judge_submissions WHERE id=${id}`;
    expect(s!.status).toBe("queued");
  });
});

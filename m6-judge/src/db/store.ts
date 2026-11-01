import type postgres from "postgres";
import { createHash } from "node:crypto";
import type { RuntimeLimits } from "../domain/limits";
import type { JudgePackage, Language, SubmissionRequest } from "../domain/validate";
import type { ExecutionOutcome } from "../judge/execute";

export interface CreateInput {
  callerId: string;
  idempotencyKey: string;
  requestHash: string;
  request: SubmissionRequest;
  traceId: string;
  limits: RuntimeLimits;
}

export interface SubmissionRow {
  id: string;
  clientSubmissionId: string;
  status: string;
  traceId: string;
  createdAt: Date;
}

export type CreateResult =
  | { kind: "created"; submission: SubmissionRow }
  | { kind: "replay"; submission: SubmissionRow }
  | { kind: "key_reused" }
  | { kind: "client_exists" };

export interface ClaimedSubmission {
  id: string;
  language: Language;
  sourceCode: string;
  pkg: JudgePackage;
  limits: RuntimeLimits;
  attemptCount: number;
  traceId: string;
}

export interface OutboxRow {
  id: number;
  submissionId: string;
  kind: string;
  payload: Record<string, unknown>;
  eventId: string | null;
  attempts: number;
}

export interface StatusView {
  judgeSubmissionId: string;
  clientSubmissionId: string;
  status: string;
  verdict?: string;
  executionStatus?: string;
  failureCode?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface Store {
  createSubmission(i: CreateInput): Promise<CreateResult>;
  getStatus(id: string): Promise<StatusView | null>;
  claimSubmission(id: string): Promise<ClaimedSubmission | null>;
  completeSubmission(id: string, outcome: ExecutionOutcome): Promise<boolean>;
  requeueSubmission(id: string): Promise<boolean>;
  reenqueue(id: string): Promise<void>;
  claimDueOutbox(kind: "enqueue" | "callback", limit: number, leaseMs: number, now?: Date): Promise<OutboxRow[]>;
  markOutboxDelivered(id: number): Promise<void>;
  markOutboxRetry(id: number, delayMs: number, error: string, now?: Date): Promise<void>;
  markOutboxDead(id: number, error: string): Promise<void>;
  findStuck(olderThanMs: number, now?: Date): Promise<string[]>;
}

const toRow = (r: any): SubmissionRow => ({
  id: r.id,
  clientSubmissionId: r.client_submission_id,
  status: r.status,
  traceId: r.trace_id,
  createdAt: r.created_at,
});

export function createStore(sql: postgres.Sql): Store {
  const json = (v: unknown) => sql.json(v as postgres.JSONValue);

  async function lookup(callerId: string, key: string, hash: string, clientId: string): Promise<CreateResult | null> {
    // Single statement => consistent snapshot even when an identical request commits concurrently.
    const rows = await sql`SELECT * FROM judge_submissions
      WHERE (caller_id=${callerId} AND idempotency_key=${key}) OR client_submission_id=${clientId}`;
    const byKey = rows.find((r) => r.caller_id === callerId && r.idempotency_key === key);
    if (byKey) return byKey.request_hash === hash ? { kind: "replay", submission: toRow(byKey) } : { kind: "key_reused" };
    return rows.length > 0 ? { kind: "client_exists" } : null;
  }


  return {
    async createSubmission(i) {
      const existing = await lookup(i.callerId, i.idempotencyKey, i.requestHash, i.request.clientSubmissionId);
      if (existing) return existing;
      try {
        return await sql.begin(async (tx) => {
          const r = i.request;
          const [row] = await tx`INSERT INTO judge_submissions
            (caller_id, idempotency_key, request_hash, client_submission_id, attempt_id, assessment_item_id, revision, language, limits, trace_id)
            VALUES (${i.callerId}, ${i.idempotencyKey}, ${i.requestHash}, ${r.clientSubmissionId}, ${r.attemptId},
                    ${r.assessmentItemId}, ${r.revision}, ${r.language}, ${json(i.limits)}, ${i.traceId})
            RETURNING *`;
          const sourceHash = createHash("sha256").update(r.sourceCode).digest("hex");
          await tx`INSERT INTO judge_payload_snapshots (submission_id, source_code, judge_package, source_hash)
            VALUES (${row!.id}, ${r.sourceCode}, ${json(r.judgePackage)}, ${sourceHash})`;
          await tx`INSERT INTO judge_outbox (submission_id, kind, payload)
            VALUES (${row!.id}, 'enqueue', ${json({ judgeSubmissionId: row!.id, traceId: i.traceId })})`;
          return { kind: "created", submission: toRow(row) } as CreateResult;
        });
      } catch (e) {
        if ((e as { code?: string }).code === "23505") {
          // Lost a race with an identical concurrent request: resolve from the committed state.
          const again = await lookup(i.callerId, i.idempotencyKey, i.requestHash, i.request.clientSubmissionId);
          if (again) return again;
        }
        throw e;
      }
    },

    async getStatus(id) {
      const [r] = await sql`SELECT s.*, r.verdict, r.execution_status, r.failure_code
        FROM judge_submissions s LEFT JOIN judge_results r ON r.submission_id = s.id WHERE s.id=${id}`;
      if (!r) return null;
      const iso = (d: Date | null) => (d ? new Date(d).toISOString() : undefined);
      return {
        judgeSubmissionId: r.id,
        clientSubmissionId: r.client_submission_id,
        status: r.status,
        ...(r.verdict ? { verdict: r.verdict } : {}),
        ...(r.execution_status ? { executionStatus: r.execution_status } : {}),
        ...(r.failure_code ? { failureCode: r.failure_code } : {}),
        createdAt: iso(r.created_at)!,
        ...(r.started_at ? { startedAt: iso(r.started_at) } : {}),
        ...(r.finished_at ? { finishedAt: iso(r.finished_at) } : {}),
      };
    },

    async claimSubmission(id) {
      const [s] = await sql`UPDATE judge_submissions
        SET status='running', started_at=COALESCE(started_at, now()), attempt_count=attempt_count+1, updated_at=now()
        WHERE id=${id} AND status='queued' RETURNING *`;
      if (!s) return null;
      const [snap] = await sql`SELECT source_code, judge_package FROM judge_payload_snapshots WHERE submission_id=${id}`;
      return {
        id: s.id,
        language: s.language,
        sourceCode: snap!.source_code,
        pkg: snap!.judge_package as JudgePackage,
        limits: s.limits as RuntimeLimits,
        attemptCount: s.attempt_count,
        traceId: s.trace_id,
      };
    },

    async completeSubmission(id, outcome) {
      return sql.begin(async (tx) => {
        const status = outcome.executionStatus === "completed" ? "completed" : "failed";
        const [s] = await tx`UPDATE judge_submissions SET status=${status}, finished_at=now(), updated_at=now()
          WHERE id=${id} AND status='running' RETURNING *`;
        if (!s) return false;
        const done = outcome.executionStatus === "completed" ? outcome : null;
        const failed = outcome.executionStatus === "failed" ? outcome : null;
        await tx`INSERT INTO judge_results
          (submission_id, execution_status, verdict, summary, metrics, diagnostics, failure_code, failure_retryable)
          VALUES (${id}, ${outcome.executionStatus}, ${done?.verdict ?? null},
                  ${done ? json(done.summary) : null}, ${done ? json(done.metrics) : null},
                  ${done ? json(done.diagnostics) : null}, ${failed?.failure.code ?? null}, ${failed?.failure.retryable ?? null})`;
        for (const ev of outcome.events) {
          await tx`INSERT INTO judge_events (submission_id, type, metadata)
            VALUES (${id}, ${ev.type}, ${json(ev.testCaseId ? { testCaseId: ev.testCaseId } : {})})`;
        }
        const eventId = crypto.randomUUID();
        const payload: Record<string, unknown> = {
          contractVersion: "1.0",
          eventId,
          occurredAt: new Date().toISOString(),
          judgeSubmissionId: id,
          clientSubmissionId: s.client_submission_id,
          attemptId: s.attempt_id,
          assessmentItemId: s.assessment_item_id,
          revision: s.revision,
          executionStatus: outcome.executionStatus,
          ...(done
            ? { verdict: done.verdict, summary: done.summary, metrics: done.metrics, diagnostics: done.diagnostics }
            : { failure: failed!.failure }),
          traceId: s.trace_id,
        };
        await tx`INSERT INTO judge_outbox (submission_id, kind, payload, event_id)
          VALUES (${id}, 'callback', ${json(payload)}, ${eventId})`;
        return true;
      });
    },

    async requeueSubmission(id) {
      const r = await sql`UPDATE judge_submissions SET status='queued', updated_at=now() WHERE id=${id} AND status='running' RETURNING id`;
      return r.length > 0;
    },

    async reenqueue(id) {
      await sql.begin(async (tx) => {
        const [s] = await tx`UPDATE judge_submissions
          SET status='queued', updated_at=now() WHERE id=${id} AND status IN ('queued','running') RETURNING trace_id`;
        if (!s) return;
        await tx`INSERT INTO judge_outbox (submission_id, kind, payload)
          VALUES (${id}, 'enqueue', ${json({ judgeSubmissionId: id, traceId: s.trace_id })})`;
      });
    },

    async claimDueOutbox(kind, limit, leaseMs, now = new Date()) {
      const lease = new Date(now.getTime() + leaseMs);
      const rows = await sql`UPDATE judge_outbox SET next_attempt_at=${lease}
        WHERE id IN (
          SELECT id FROM judge_outbox
          WHERE kind=${kind} AND state='pending' AND next_attempt_at <= ${now}
          ORDER BY id LIMIT ${limit} FOR UPDATE SKIP LOCKED)
        RETURNING id, submission_id, kind, payload, event_id, attempts`;
      return rows
        .map((r) => ({
          id: Number(r.id),
          submissionId: r.submission_id,
          kind: r.kind,
          payload: r.payload,
          eventId: r.event_id,
          attempts: r.attempts,
        }))
        .sort((a, b) => a.id - b.id);
    },

    async markOutboxDelivered(id) {
      await sql`UPDATE judge_outbox SET state='delivered', delivered_at=now() WHERE id=${id}`;
    },

    async markOutboxRetry(id, delayMs, error, now = new Date()) {
      const next = new Date(now.getTime() + delayMs);
      await sql`UPDATE judge_outbox SET attempts=attempts+1, next_attempt_at=${next}, last_error=${error} WHERE id=${id}`;
    },

    async markOutboxDead(id, error) {
      await sql`UPDATE judge_outbox SET state='dead', last_error=${error} WHERE id=${id}`;
    },

    async findStuck(olderThanMs, now = new Date()) {
      const cutoff = new Date(now.getTime() - olderThanMs);
      const rows = await sql`SELECT s.id FROM judge_submissions s
        WHERE s.updated_at < ${cutoff}
          AND (s.status='running'
               OR (s.status='queued' AND NOT EXISTS (
                     SELECT 1 FROM judge_outbox o WHERE o.submission_id=s.id AND o.kind='enqueue' AND o.state='pending')))
        ORDER BY s.created_at`;
      return rows.map((r) => r.id as string);
    },
  };
}

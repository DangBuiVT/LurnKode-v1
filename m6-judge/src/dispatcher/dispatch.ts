import { backoffDelayMs, classifyCallbackStatus, MAX_CALLBACK_ATTEMPTS } from "../domain/backoff";
import type { Store } from "../db/store";
import { MAX_JOB_ATTEMPTS } from "../worker/process";

interface QueueLike {
  add(name: string, data: unknown, opts?: Record<string, unknown>): Promise<unknown>;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/** Move pending enqueue-outbox rows into BullMQ. Job id = submission id → duplicates are ignored. */
export async function dispatchEnqueue(d: { store: Store; queue: QueueLike }): Promise<number> {
  const rows = await d.store.claimDueOutbox("enqueue", 50, 30_000);
  let n = 0;
  for (const row of rows) {
    const p = row.payload as { judgeSubmissionId: string; traceId: string };
    try {
      await d.queue.add(
        "judge",
        { schemaVersion: "1.0", judgeSubmissionId: p.judgeSubmissionId, traceId: p.traceId },
        {
          jobId: p.judgeSubmissionId,
          attempts: MAX_JOB_ATTEMPTS,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { age: 86_400 },
          removeOnFail: false,
        },
      );
      await d.store.markOutboxDelivered(row.id);
      n++;
    } catch (e) {
      await d.store.markOutboxRetry(row.id, backoffDelayMs(row.attempts + 1), msg(e));
    }
  }
  return n;
}

export interface CallbackDeps {
  store: Store;
  callbackUrl: string;
  callbackToken: string;
  fetch: typeof fetch;
  rand?: () => number;
}

/** Deliver result callbacks: durable at-least-once with a stable eventId (consumer is idempotent). */
export async function dispatchCallbacks(d: CallbackDeps): Promise<number> {
  const rows = await d.store.claimDueOutbox("callback", 20, 60_000);
  let delivered = 0;
  for (const row of rows) {
    let status = 0;
    let error = "";
    try {
      const res = await d.fetch(d.callbackUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${d.callbackToken}`,
          "idempotency-key": row.eventId ?? String((row.payload as { eventId?: string }).eventId),
        },
        body: JSON.stringify(row.payload),
        signal: AbortSignal.timeout(5000),
      });
      status = res.status;
      await res.body?.cancel();
    } catch (e) {
      error = msg(e);
    }
    const cls = classifyCallbackStatus(status);
    const attempt = row.attempts + 1;
    if (cls === "ack") {
      await d.store.markOutboxDelivered(row.id);
      delivered++;
    } else if (cls === "fatal") {
      await d.store.markOutboxDead(row.id, `http ${status}`);
    } else if (attempt >= MAX_CALLBACK_ATTEMPTS) {
      await d.store.markOutboxDead(row.id, `retries exhausted: ${error || `http ${status}`}`);
    } else {
      await d.store.markOutboxRetry(row.id, backoffDelayMs(attempt, d.rand), error || `http ${status}`);
    }
  }
  return delivered;
}

/** Reconciliation: re-enqueue submissions stuck in non-terminal states. */
export async function reconcile(store: Store, olderThanMs = 120_000): Promise<number> {
  const ids = await store.findStuck(olderThanMs);
  for (const id of ids) await store.reenqueue(id);
  return ids.length;
}

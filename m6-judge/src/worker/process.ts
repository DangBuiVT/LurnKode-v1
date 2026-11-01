import type { Store } from "../db/store";
import type { ExecuteInput, ExecutionOutcome } from "../judge/execute";

export const MAX_JOB_ATTEMPTS = 3;

export interface ProcessDeps {
  store: Store;
  execute: (i: ExecuteInput) => Promise<ExecutionOutcome>;
}

export interface JobLike {
  data: { schemaVersion?: string; judgeSubmissionId: string; traceId?: string };
  attemptsMade: number;
}

/**
 * Process one queue job. At-least-once safe: the atomic claim ensures a duplicate or
 * concurrent delivery cannot execute again or create a second final result.
 * Throws only to ask BullMQ to retry after a retryable infrastructure failure.
 */
export async function processJob(d: ProcessDeps, job: JobLike): Promise<void> {
  const claim = await d.store.claimSubmission(job.data.judgeSubmissionId);
  if (!claim) return;

  let outcome: ExecutionOutcome;
  try {
    outcome = await d.execute({
      language: claim.language,
      sourceCode: claim.sourceCode,
      pkg: claim.pkg,
      limits: claim.limits,
    });
  } catch {
    outcome = {
      executionStatus: "failed",
      failure: { code: "WORKER_FAILURE", retryable: true },
      events: [{ type: "worker_failure" }],
    };
  }

  if (outcome.executionStatus === "failed" && outcome.failure.retryable) {
    if (job.attemptsMade + 1 < MAX_JOB_ATTEMPTS) {
      await d.store.requeueSubmission(claim.id);
      throw new Error(`retry: ${outcome.failure.code}`);
    }
    outcome = {
      executionStatus: "failed",
      failure: { code: "RETRY_EXHAUSTED", retryable: false },
      events: [...outcome.events, { type: "retry_exhausted" }],
    };
  }
  await d.store.completeSubmission(claim.id, outcome);
}

/**
 * @file services/callback.service.ts
 * @description Idempotent processing of M6 Judge Worker execution callbacks.
 */

import { assessmentRepository, AssessmentRepository } from "../repositories/assessment.repository";
import type { CodeSubmission } from "../schemas/assessment.types";
import type { JudgeCallbackInput } from "../schemas/assessment.zod";
import { computeProgrammingScore, type TestCaseSpec } from "./grading.service";

export class CallbackService {
  constructor(private repo: AssessmentRepository = assessmentRepository) {}

  /**
   * Processes an asynchronous grading callback from M6.
   * Ensures idempotency: duplicate callbacks for already-judged submissions are safely ignored.
   */
  async processJudgeCallback(payload: JudgeCallbackInput): Promise<{ submission: CodeSubmission; idempotent: boolean }> {
    const submission = await this.repo.findCodeSubmissionById(payload.submissionId);
    if (!submission) {
      throw new Error(`Submission ${payload.submissionId} not found`);
    }

    // Idempotency check: ignore duplicate callback if already judged
    if (submission.status === "judged") {
      console.info(`[CallbackService] Idempotent hit: submission ${payload.submissionId} is already judged.`);
      return { submission, idempotent: true };
    }

    const item = await this.repo.findItemById(submission.itemId);
    if (!item) {
      throw new Error(`Item ${submission.itemId} not found`);
    }

    if (payload.status === "failed") {
      const failed = await this.repo.updateCodeSubmission(submission.id, {
        status: "failed",
        errorMessage: payload.error ?? "Judge execution failed",
      });
      return { submission: failed!, idempotent: false };
    }

    // 1. Persist individual test case verdicts
    await this.repo.insertTestResults(
      submission.id,
      payload.testResults.map((tr) => ({
        testCaseId: tr.testCaseId,
        status: tr.status,
        executionMs: tr.executionMs,
        message: tr.message,
        hidden: tr.hidden,
      }))
    );

    // 2. Compute final programming score using pure grading engine
    const testSpecs: TestCaseSpec[] = (item.programmingPayload?.hiddenTestCases ?? []).map((tc) => ({
      id: tc.id,
      weight: tc.weight,
      hidden: tc.hidden,
    }));

    const grading = computeProgrammingScore(
      testSpecs,
      payload.testResults.map((tr) => ({
        testCaseId: tr.testCaseId,
        status: tr.status,
        executionMs: tr.executionMs,
        message: tr.message ?? undefined,
        hidden: tr.hidden,
      })),
      item.points
    );

    // 3. Atomically update submission status
    const judged = await this.repo.updateCodeSubmission(submission.id, {
      status: "judged",
      finalStatus: grading.finalStatus,
      score: grading.score,
      maxScore: item.points,
      executionMs: payload.executionMs,
      memoryKb: payload.memoryKb,
    });

    return { submission: judged!, idempotent: false };
  }
}

export const callbackService = new CallbackService();


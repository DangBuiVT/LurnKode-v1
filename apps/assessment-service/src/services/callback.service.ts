/**
 * @file services/callback.service.ts
 * @description Idempotent processing of M6 Judge Worker execution callbacks.
 */

import { ServiceError } from "../middlewares/error.middleware";
import { assessmentRepository, AssessmentRepository } from "../repositories/assessment.repository";
import type { CodeSubmission } from "../schemas/assessment.types";
import type { JudgeCallbackInput } from "../schemas/assessment.zod";
import { attemptService, AttemptService } from "./attempt.service";
import { computeProgrammingScore, type TestCaseSpec } from "./grading.service";

export class CallbackService {
  constructor(
    private repo: AssessmentRepository = assessmentRepository,
    private attempts: AttemptService = attemptService
  ) {}

  /**
   * Processes an asynchronous grading callback from M6.
   * Ensures idempotency: duplicate callbacks for already-judged submissions are safely ignored.
   */
  async processJudgeCallback(
    payload: JudgeCallbackInput
  ): Promise<{ submission: CodeSubmission; idempotent: boolean }> {
    const submission = await this.repo.findCodeSubmissionById(payload.submissionId);
    if (!submission) {
      throw new ServiceError(
        404,
        "SUBMISSION_NOT_FOUND",
        `Submission ${payload.submissionId} not found`
      );
    }

    // Idempotency check: ignore duplicate callback if already judged.
    // finalizeAttemptIfGraded is still called so a previously interrupted
    // attempt finalization can self-heal.
    if (submission.status === "judged") {
      console.info(`[CallbackService] Idempotent hit: submission ${payload.submissionId} is already judged.`);
      await this.attempts.finalizeAttemptIfGraded(submission.attemptId);
      return { submission, idempotent: true };
    }

    const item = await this.repo.findItemById(submission.itemId);
    if (!item) {
      throw new ServiceError(404, "ITEM_NOT_FOUND", `Item ${submission.itemId} not found`);
    }

    if (payload.status === "failed") {
      const failed = await this.repo.updateCodeSubmission(submission.id, {
        status: "failed",
        errorMessage: payload.error ?? "Judge execution failed",
      });

      await this.attempts.finalizeAttemptIfGraded(submission.attemptId);

      return { submission: failed!, idempotent: false };
    }

    const programmingPayload = item.programmingPayload;
    if (!programmingPayload) {
      throw new ServiceError(
        400,
        "INVALID_PROGRAMMING_ITEM",
        `Item ${item.id} is not a programming item with a payload`
      );
    }

    // Reject verdicts for test cases that do not belong to this item instead of
    // silently trusting an unvalidated callback payload.
    const knownTestCaseIds = new Set(programmingPayload.hiddenTestCases.map((testCase) => testCase.id));
    const unknownTestCaseIds = payload.testResults
      .map((result) => result.testCaseId)
      .filter((testCaseId) => !knownTestCaseIds.has(testCaseId));

    if (unknownTestCaseIds.length > 0) {
      throw new ServiceError(
        400,
        "UNKNOWN_TEST_CASE",
        "Callback contains test case IDs that do not belong to this item",
        { unknownTestCaseIds }
      );
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
    const testSpecs: TestCaseSpec[] = programmingPayload.hiddenTestCases.map((tc) => ({
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

    // 3. Atomically update submission status (single transaction once backed by PostgreSQL)
    const judged = await this.repo.updateCodeSubmission(submission.id, {
      status: "judged",
      finalStatus: grading.finalStatus,
      score: grading.score,
      maxScore: item.points,
      executionMs: payload.executionMs,
      memoryKb: payload.memoryKb,
    });

    // 4. Roll the graded item into the attempt total and complete if fully graded
    await this.attempts.finalizeAttemptIfGraded(submission.attemptId);

    return { submission: judged!, idempotent: false };
  }
}

export const callbackService = new CallbackService();

/**
 * @file services/attempt.service.ts
 * @description Orchestrates learner attempt lifecycle, inter-service enrollment checks, and scoring.
 */

import { courseClient, CourseServiceClient, type EnrollmentCheckResult } from "../clients/course.client";
import { eventPublisher, EventPublisher } from "../events/event.publisher";
import type { ItemGradingSummary } from "../events/event.types";
import { mapItemForLearner, type LearnerSafeItem } from "../mappers/assessment.mapper";
import { ServiceError } from "../middlewares/error.middleware";
import { assessmentRepository, AssessmentRepository } from "../repositories/assessment.repository";
import type { Answer, Attempt, CodeSubmission } from "../schemas/assessment.types";
import { gradeMcq } from "./grading.service";
import { queueService, QueueService } from "./queue.service";

export class AttemptService {
  constructor(
    private repo: AssessmentRepository = assessmentRepository,
    private m2Client: CourseServiceClient = courseClient,
    private queue: QueueService = queueService,
    private publisher: EventPublisher = eventPublisher
  ) {}

  /**
   * Starts an attempt for an assessment after verifying enrollment with M2 Course Service.
   */
  async startAttempt(
    assessmentId: string,
    userId: string,
    correlationId?: string
  ): Promise<{ attempt: Attempt; items: LearnerSafeItem[] }> {
    const assessment = await this.repo.findAssessmentById(assessmentId);
    if (!assessment) {
      throw new ServiceError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found");
    }
    if (assessment.status !== "published") {
      throw new ServiceError(409, "ASSESSMENT_NOT_PUBLISHED", "Assessment is not published");
    }

    // 1. Inter-Service RPC: Check enrollment with M2 Course Service
    let enrollment: EnrollmentCheckResult;
    try {
      enrollment = await this.m2Client.checkEnrollment(assessment.courseId, userId, correlationId);
    } catch (err: unknown) {
      throw new ServiceError(
        503,
        "M2_UNAVAILABLE",
        "Course enrollment could not be verified; please retry shortly",
        err instanceof Error ? err.message : undefined
      );
    }
    if (!enrollment.enrolled) {
      throw new ServiceError(403, "NOT_ENROLLED", "Learner is not enrolled in this course");
    }

    // 2. Enforce Attempt Quotas and Active Status
    const existingActive = await this.repo.findActiveAttempt(assessmentId, userId);
    if (existingActive) {
      throw new ServiceError(
        409,
        "ACTIVE_ATTEMPT_EXISTS",
        "An active attempt is already in progress"
      );
    }

    const previousCount = await this.repo.countAttempts(assessmentId, userId);
    if (previousCount >= assessment.maxAttempts) {
      throw new ServiceError(
        409,
        "ATTEMPT_LIMIT_REACHED",
        `Maximum attempt limit (${assessment.maxAttempts}) reached`
      );
    }

    // 3. Compute Max Score and Create Attempt
    const items = await this.repo.listItemsByAssessmentId(assessmentId);
    const maxScore = items.reduce((acc, item) => acc + item.points, 0);

    const attempt = await this.repo.createAttempt({
      assessmentId,
      userId,
      status: "in_progress",
      score: 0,
      maxScore,
      submittedAt: null,
      completedAt: null,
    });

    // 4. Return sanitized learner items
    const safeItems = items.map(mapItemForLearner);
    return { attempt, items: safeItems };
  }

  /**
   * Submits and synchronously grades an MCQ response.
   */
  async submitMcqAnswer(
    attemptId: string,
    userId: string,
    itemId: string,
    selectedOptionIds: string[]
  ): Promise<Answer> {
    const attempt = await this.repo.findAttemptById(attemptId);
    if (!attempt) {
      throw new ServiceError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
    }
    if (attempt.userId !== userId) {
      throw new ServiceError(403, "ATTEMPT_FORBIDDEN", "Unauthorized access to attempt");
    }
    if (attempt.status !== "in_progress") {
      throw new ServiceError(
        409,
        "ATTEMPT_NOT_ACTIVE",
        `Attempt is no longer in progress (status: ${attempt.status})`
      );
    }

    const item = await this.repo.findItemById(itemId);
    if (!item || item.assessmentId !== attempt.assessmentId || item.type !== "mcq") {
      throw new ServiceError(400, "INVALID_MCQ_ITEM", "Invalid MCQ question item");
    }

    const correctOptionIds = item.mcqPayload?.correctOptionIds ?? [];
    const grading = gradeMcq(selectedOptionIds, correctOptionIds, item.points);

    const answer = await this.repo.upsertAnswer({
      attemptId,
      itemId,
      selectedOptionIds,
      score: grading.score,
      maxScore: item.points,
      status: grading.status,
    });

    // Recalculate Attempt Total Score
    await this.recalculateAttemptScore(attemptId);

    return answer;
  }

  /**
   * Dispatches code to M6 Judge Worker queue asynchronously.
   */
  async submitCode(
    attemptId: string,
    userId: string,
    itemId: string,
    language: string,
    sourceCode: string
  ): Promise<CodeSubmission> {
    const attempt = await this.repo.findAttemptById(attemptId);
    if (!attempt) {
      throw new ServiceError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
    }
    if (attempt.userId !== userId) {
      throw new ServiceError(403, "ATTEMPT_FORBIDDEN", "Unauthorized access to attempt");
    }
    if (attempt.status !== "in_progress") {
      throw new ServiceError(
        409,
        "ATTEMPT_NOT_ACTIVE",
        `Attempt is no longer in progress (status: ${attempt.status})`
      );
    }

    const item = await this.repo.findItemById(itemId);
    if (!item || item.assessmentId !== attempt.assessmentId || item.type !== "programming") {
      throw new ServiceError(400, "INVALID_PROGRAMMING_ITEM", "Invalid programming question item");
    }

    const programmingPayload = item.programmingPayload;
    if (!programmingPayload) {
      throw new ServiceError(400, "INVALID_PROGRAMMING_ITEM", "Programming item has no payload");
    }

    // Do not let a learner submit JavaScript against a Python task (or vice versa).
    if (language !== programmingPayload.language) {
      throw new ServiceError(
        400,
        "LANGUAGE_MISMATCH",
        `Item expects '${programmingPayload.language}' but '${language}' was submitted`
      );
    }

    const assessment = await this.repo.findAssessmentById(attempt.assessmentId);

    // Insert CodeSubmission in queued state
    const submission = await this.repo.createCodeSubmission({
      attemptId,
      itemId,
      language,
      sourceCode,
      status: "queued",
      judgeJobId: null,
      finalStatus: null,
      score: 0,
      maxScore: item.points,
    });

    // Dispatch job to BullMQ
    const jobId = await this.queue.enqueueJudgeJob({
      submissionId: submission.id,
      attemptId,
      itemId,
      courseId: assessment?.courseId ?? "",
      language,
      sourceCode,
      testCases: programmingPayload.hiddenTestCases,
      limits: programmingPayload.limits,
      callbackUrl: "/internal/judge/callback",
      submittedAt: new Date().toISOString(),
    });

    await this.repo.updateCodeSubmission(submission.id, { judgeJobId: jobId });
    return submission;
  }

  /**
   * Picks the latest judged submission per item so retries/resubmissions cannot
   * be double-counted in the attempt total.
   */
  private latestJudgedByItem(submissions: CodeSubmission[]): Map<string, CodeSubmission> {
    const latest = new Map<string, CodeSubmission>();

    for (const submission of submissions) {
      if (submission.status !== "judged") continue;
      const current = latest.get(submission.itemId);
      if (!current || submission.updatedAt >= current.updatedAt) {
        latest.set(submission.itemId, submission);
      }
    }

    return latest;
  }

  private hasPendingSubmissions(submissions: CodeSubmission[]): boolean {
    return submissions.some(
      (submission) => submission.status === "queued" || submission.status === "running"
    );
  }

  /**
   * Recalculates the overall attempt score as:
   *   sum(MCQ answer scores) + sum(latest judged programming submission per item).
   * Scores are rounded to 2 decimal places.
   */
  async recalculateAttemptScore(attemptId: string): Promise<Attempt | null> {
    const attempt = await this.repo.findAttemptById(attemptId);
    if (!attempt) return null;

    const [answers, submissions] = await Promise.all([
      this.repo.listAnswersByAttemptId(attemptId),
      this.repo.listCodeSubmissionsByAttemptId(attemptId),
    ]);

    const mcqTotal = answers.reduce((sum, answer) => sum + answer.score, 0);
    const programmingTotal = Array.from(this.latestJudgedByItem(submissions).values()).reduce(
      (sum, submission) => sum + submission.score,
      0
    );

    const total = Math.round((mcqTotal + programmingTotal) * 100) / 100;

    return this.repo.updateAttempt(attemptId, { score: total });
  }

  private async buildBreakdown(attempt: Attempt): Promise<ItemGradingSummary[]> {
    const [items, answers, submissions] = await Promise.all([
      this.repo.listItemsByAssessmentId(attempt.assessmentId),
      this.repo.listAnswersByAttemptId(attempt.id),
      this.repo.listCodeSubmissionsByAttemptId(attempt.id),
    ]);

    const answersByItem = new Map(answers.map((answer) => [answer.itemId, answer]));
    const latestSubmissions = this.latestJudgedByItem(submissions);
    const breakdown: ItemGradingSummary[] = [];

    for (const item of items) {
      if (item.type === "mcq") {
        const answer = answersByItem.get(item.id);
        if (!answer) continue;
        breakdown.push({
          itemId: item.id,
          type: "mcq",
          score: answer.score,
          maxScore: answer.maxScore,
          finalStatus: answer.status,
        });
      } else {
        const submission = latestSubmissions.get(item.id);
        if (!submission) continue;
        breakdown.push({
          itemId: item.id,
          type: "programming",
          score: submission.score,
          maxScore: submission.maxScore,
          finalStatus: submission.finalStatus ?? undefined,
        });
      }
    }

    return breakdown;
  }

  /**
   * Marks the attempt completed and publishes exactly one completion event.
   * Safe to call more than once: already-completed attempts are returned untouched.
   */
  private async completeAttempt(attemptId: string): Promise<Attempt> {
    const attempt = await this.repo.findAttemptById(attemptId);
    if (!attempt) {
      throw new ServiceError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
    }
    if (attempt.status === "completed") return attempt;

    await this.recalculateAttemptScore(attemptId);
    const completedAt = new Date();
    const updated = await this.repo.updateAttempt(attemptId, {
      status: "completed",
      completedAt,
    });

    if (!updated) {
      throw new ServiceError(500, "ATTEMPT_UPDATE_FAILED", "Failed to finalize attempt");
    }

    const breakdown = await this.buildBreakdown(updated);

    await this.publisher.publishAttemptCompleted({
      attemptId: updated.id,
      assessmentId: updated.assessmentId,
      courseId: (await this.repo.findAssessmentById(updated.assessmentId))?.courseId ?? "",
      userId: updated.userId,
      score: updated.score,
      maxScore: updated.maxScore,
      percentage: updated.maxScore > 0 ? (updated.score / updated.maxScore) * 100 : 0,
      passed: updated.score >= updated.maxScore * 0.5,
      completedAt: completedAt.toISOString(),
      breakdown,
    });

    return updated;
  }

  /**
   * Called by the judge callback after a submission is graded. Completes the
   * attempt once no queued/running submissions remain.
   */
  async finalizeAttemptIfGraded(attemptId: string): Promise<Attempt | null> {
    const attempt = await this.repo.findAttemptById(attemptId);
    if (!attempt) return null;

    // Only finalized attempts (submitted/grading) auto-complete; in_progress
    // attempts still accept answers/submissions.
    if (attempt.status !== "submitted" && attempt.status !== "grading") {
      return attempt;
    }

    const submissions = await this.repo.listCodeSubmissionsByAttemptId(attemptId);
    await this.recalculateAttemptScore(attemptId);

    if (this.hasPendingSubmissions(submissions)) {
      return this.repo.findAttemptById(attemptId);
    }

    return this.completeAttempt(attemptId);
  }

  /**
   * Explicitly submits an attempt. With pending code jobs the attempt moves to
   * `grading`; otherwise it completes immediately and emits the domain event.
   */
  async finishAttempt(attemptId: string, userId: string): Promise<Attempt> {
    const attempt = await this.repo.findAttemptById(attemptId);
    if (!attempt) {
      throw new ServiceError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
    }
    if (attempt.userId !== userId) {
      throw new ServiceError(403, "ATTEMPT_FORBIDDEN", "Unauthorized access to attempt");
    }
    if (attempt.status !== "in_progress") {
      throw new ServiceError(
        409,
        "ATTEMPT_ALREADY_FINISHED",
        `Attempt has already been finished (status: ${attempt.status})`
      );
    }

    const submissions = await this.repo.listCodeSubmissionsByAttemptId(attemptId);
    const pending = this.hasPendingSubmissions(submissions);

    await this.repo.updateAttempt(attemptId, {
      status: "submitted",
      submittedAt: new Date(),
    });

    await this.recalculateAttemptScore(attemptId);

    if (pending) {
      await this.repo.updateAttempt(attemptId, { status: "grading" });
      const grading = await this.repo.findAttemptById(attemptId);
      if (!grading) {
        throw new ServiceError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
      }
      return grading;
    }

    return this.completeAttempt(attemptId);
  }
}

export const attemptService = new AttemptService();

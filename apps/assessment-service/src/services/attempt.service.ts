/**
 * @file services/attempt.service.ts
 * @description Orchestrates learner attempt lifecycle, inter-service enrollment checks, and scoring.
 */

import { courseClient, CourseServiceClient } from "../clients/course.client";
import { eventPublisher, EventPublisher } from "../events/event.publisher";
import { mapItemForLearner, type LearnerSafeItem } from "../mappers/assessment.mapper";
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
    if (!assessment) throw new Error("Assessment not found");
    if (assessment.status !== "published") throw new Error("Assessment is not published");

    // 1. Inter-Service RPC: Check enrollment with M2 Course Service
    const enrollment = await this.m2Client.checkEnrollment(assessment.courseId, userId, correlationId);
    if (!enrollment.enrolled) {
      throw new Error("Learner is not enrolled in this course");
    }

    // 2. Enforce Attempt Quotas and Active Status
    const existingActive = await this.repo.findActiveAttempt(assessmentId, userId);
    if (existingActive) {
      throw new Error("An active attempt is already in progress");
    }

    const previousCount = await this.repo.countAttempts(assessmentId, userId);
    if (previousCount >= assessment.maxAttempts) {
      throw new Error(`Maximum attempt limit (${assessment.maxAttempts}) reached`);
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
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== userId) throw new Error("Unauthorized access to attempt");
    if (attempt.status !== "in_progress") throw new Error("Attempt is no longer in progress");

    const item = await this.repo.findItemById(itemId);
    if (!item || item.assessmentId !== attempt.assessmentId || item.type !== "mcq") {
      throw new Error("Invalid MCQ question item");
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
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== userId) throw new Error("Unauthorized access to attempt");
    if (attempt.status !== "in_progress") throw new Error("Attempt is no longer in progress");

    const item = await this.repo.findItemById(itemId);
    if (!item || item.assessmentId !== attempt.assessmentId || item.type !== "programming") {
      throw new Error("Invalid programming question item");
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
      testCases: item.programmingPayload?.hiddenTestCases ?? [],
      limits: item.programmingPayload?.limits ?? { cpu: 1, memoryMb: 128, timeoutMs: 3000 },
      callbackUrl: "/internal/judge/callback",
      submittedAt: new Date().toISOString(),
    });

    await this.repo.updateCodeSubmission(submission.id, { judgeJobId: jobId });
    return submission;
  }

  /**
   * Recalculates overall attempt score and triggers domain events if completed.
   */
  async recalculateAttemptScore(attemptId: string): Promise<Attempt | null> {
    const attempt = await this.repo.findAttemptById(attemptId);
    if (!attempt) return null;

    const answers = await this.repo.listAnswersByAttemptId(attemptId);
    const mcqTotal = answers.reduce((sum, a) => sum + a.score, 0);

    const updated = await this.repo.updateAttempt(attemptId, {
      score: mcqTotal,
    });

    return updated;
  }

  /**
   * Explicitly submits an attempt and broadcasts an event to M2 & M4.
   */
  async finishAttempt(attemptId: string, userId: string): Promise<Attempt> {
    const attempt = await this.repo.findAttemptById(attemptId);
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.userId !== userId) throw new Error("Unauthorized access to attempt");

    const assessment = await this.repo.findAssessmentById(attempt.assessmentId);
    const completedAt = new Date();

    const updated = await this.repo.updateAttempt(attemptId, {
      status: "completed",
      submittedAt: completedAt,
      completedAt,
    });

    if (!updated) throw new Error("Failed to finalize attempt");

    // Asynchronous Domain Event Broadcast (Eventual Consistency with M2 and M4)
    await this.publisher.publishAttemptCompleted({
      attemptId: updated.id,
      assessmentId: updated.assessmentId,
      courseId: assessment?.courseId ?? "",
      userId: updated.userId,
      score: updated.score,
      maxScore: updated.maxScore,
      percentage: updated.maxScore > 0 ? (updated.score / updated.maxScore) * 100 : 0,
      passed: updated.score >= updated.maxScore * 0.5,
      completedAt: completedAt.toISOString(),
      breakdown: [],
    });

    return updated;
  }
}

export const attemptService = new AttemptService();


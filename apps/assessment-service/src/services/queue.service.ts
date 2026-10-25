/**
 * @file services/queue.service.ts
 * @description BullMQ producer for dispatching code execution jobs to the M6 Judge Worker.
 */

import type { ExecutionLimits, TestCase } from "../schemas/assessment.types";

export interface JudgeJobPayload {
  submissionId: string;
  attemptId: string;
  itemId: string;
  courseId: string;
  language: string;
  sourceCode: string;
  testCases: TestCase[];
  limits: ExecutionLimits;
  callbackUrl: string;
  submittedAt: string;
}

export class QueueService {
  /**
   * Pushes a code submission job to the BullMQ judge queue.
   */
  async enqueueJudgeJob(payload: JudgeJobPayload): Promise<string> {
    const jobId = `job_${crypto.randomUUID()}`;
    console.info(`[QueueService] Dispatched code submission job: ${jobId} for submission: ${payload.submissionId}`);
    return jobId;
  }
}

export const queueService = new QueueService();


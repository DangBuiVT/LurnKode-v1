/**
 * @file routes/learner.assessment.routes.ts
 * @description HTTP route controllers for learner attempt, answer, and submission endpoints.
 *
 * Microservice Gateway Context:
 * - Learner identity injected via X-User-Id header.
 */

import { Elysia } from "elysia";
import { attemptService } from "../services/attempt.service";
import { submitMcqAnswerSchema, submitCodeSchema } from "../schemas/assessment.zod";

export const learnerRoutes = new Elysia({ prefix: "/learner" })
  .post("/assessments/:id/attempts", async ({ params: { id }, headers, set }) => {
    const userId = headers["x-user-id"] || "learner_dev_user";
    const correlationId = headers["x-correlation-id"];

    try {
      const result = await attemptService.startAttempt(id, userId, correlationId);
      set.status = 201;
      return result;
    } catch (err: unknown) {
      set.status = 400;
      return { error: (err as Error).message };
    }
  })
  .post("/attempts/:attemptId/answers", async ({ params: { attemptId }, headers, body, set }) => {
    const userId = headers["x-user-id"] || "learner_dev_user";
    const parsed = submitMcqAnswerSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { error: "Validation Error", details: parsed.error.format() };
    }

    try {
      const answer = await attemptService.submitMcqAnswer(
        attemptId,
        userId,
        parsed.data.itemId,
        parsed.data.selectedOptionIds
      );
      return answer;
    } catch (err: unknown) {
      set.status = 400;
      return { error: (err as Error).message };
    }
  })
  .post("/attempts/:attemptId/code-submissions", async ({ params: { attemptId }, headers, body, set }) => {
    const userId = headers["x-user-id"] || "learner_dev_user";
    const parsed = submitCodeSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { error: "Validation Error", details: parsed.error.format() };
    }

    try {
      const submission = await attemptService.submitCode(
        attemptId,
        userId,
        parsed.data.itemId,
        parsed.data.language,
        parsed.data.sourceCode
      );
      set.status = 202; // Accepted for async grading
      return submission;
    } catch (err: unknown) {
      set.status = 400;
      return { error: (err as Error).message };
    }
  })
  .post("/attempts/:attemptId/finish", async ({ params: { attemptId }, headers, set }) => {
    const userId = headers["x-user-id"] || "learner_dev_user";

    try {
      const attempt = await attemptService.finishAttempt(attemptId, userId);
      return attempt;
    } catch (err: unknown) {
      set.status = 400;
      return { error: (err as Error).message };
    }
  });


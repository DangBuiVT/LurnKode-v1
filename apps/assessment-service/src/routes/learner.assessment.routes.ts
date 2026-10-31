/**
 * @file routes/learner.assessment.routes.ts
 * @description HTTP route controllers for learner attempt, answer, and submission endpoints.
 *
 * Microservice Gateway Context:
 * - Learner identity injected via X-User-Id and X-User-Role headers.
 * - Missing/invalid identity is rejected; there is no development-user fallback.
 */

import { Elysia } from "elysia";
import { attemptService } from "../services/attempt.service";
import { submitMcqAnswerSchema, submitCodeSchema } from "../schemas/assessment.zod";
import { requireRole } from "../middlewares/auth.middleware";
import { handleRouteError } from "../middlewares/error.middleware";

const LEARNER_ROLES = ["learner", "student"] as const;

export const learnerRoutes = new Elysia({ prefix: "/learner" })
  .post("/assessments/:id/attempts", async ({ params: { id }, headers, set }) => {
    try {
      const user = requireRole(headers, LEARNER_ROLES);

      const result = await attemptService.startAttempt(id, user.userId, user.correlationId);
      set.status = 201;
      return result;
    } catch (err: unknown) {
      return handleRouteError(err, set);
    }
  })
  .post("/attempts/:attemptId/answers", async ({ params: { attemptId }, headers, body, set }) => {
    try {
      const user = requireRole(headers, LEARNER_ROLES);

      const parsed = submitMcqAnswerSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: "Validation Error", details: parsed.error.format() };
      }

      return await attemptService.submitMcqAnswer(
        attemptId,
        user.userId,
        parsed.data.itemId,
        parsed.data.selectedOptionIds
      );
    } catch (err: unknown) {
      return handleRouteError(err, set);
    }
  })
  .post("/attempts/:attemptId/code-submissions", async ({ params: { attemptId }, headers, body, set }) => {
    try {
      const user = requireRole(headers, LEARNER_ROLES);

      const parsed = submitCodeSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: "Validation Error", details: parsed.error.format() };
      }

      const submission = await attemptService.submitCode(
        attemptId,
        user.userId,
        parsed.data.itemId,
        parsed.data.language,
        parsed.data.sourceCode
      );
      set.status = 202; // Accepted for async grading
      return submission;
    } catch (err: unknown) {
      return handleRouteError(err, set);
    }
  })
  .post("/attempts/:attemptId/finish", async ({ params: { attemptId }, headers, set }) => {
    try {
      const user = requireRole(headers, LEARNER_ROLES);

      return await attemptService.finishAttempt(attemptId, user.userId);
    } catch (err: unknown) {
      return handleRouteError(err, set);
    }
  });

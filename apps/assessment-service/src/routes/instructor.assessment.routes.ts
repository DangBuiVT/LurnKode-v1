/**
 * @file routes/instructor.assessment.routes.ts
 * @description HTTP route controllers for instructor assessment authoring.
 *
 * Microservice Gateway Context:
 * - Protected by Gateway JWT verification.
 * - Extracts identity from X-User-Id and X-User-Role headers.
 */

import { Elysia, t } from "elysia";
import { assessmentService } from "../services/assessment.service";
import { createAssessmentSchema, createAssessmentItemSchema } from "../schemas/assessment.zod";

export const instructorRoutes = new Elysia({ prefix: "/instructor/assessments" })
  .post(
    "/",
    async ({ body, set }) => {
      const parsed = createAssessmentSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: "Validation Error", details: parsed.error.format() };
      }
      const assessment = await assessmentService.createAssessment(parsed.data);
      set.status = 201;
      return assessment;
    }
  )
  .get("/:id", async ({ params: { id }, set }) => {
    const assessment = await assessmentService.getAssessment(id);
    if (!assessment) {
      set.status = 404;
      return { error: "Assessment not found" };
    }
    return assessment;
  })
  .post("/:id/publish", async ({ params: { id }, set }) => {
    try {
      const published = await assessmentService.publishAssessment(id);
      return published;
    } catch (err: unknown) {
      set.status = 400;
      return { error: (err as Error).message };
    }
  })
  .post("/:id/items", async ({ params: { id }, body, set }) => {
    const parsed = createAssessmentItemSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { error: "Validation Error", details: parsed.error.format() };
    }
    try {
      const item = await assessmentService.addItem(id, parsed.data);
      set.status = 201;
      return item;
    } catch (err: unknown) {
      set.status = 400;
      return { error: (err as Error).message };
    }
  });


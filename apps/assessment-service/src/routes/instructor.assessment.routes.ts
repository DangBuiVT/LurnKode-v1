/**
 * @file routes/instructor.assessment.routes.ts
 * @description HTTP route controllers for instructor assessment authoring.
 *
 * Microservice Gateway Context:
 * - Protected by Gateway JWT verification.
 * - Extracts identity from X-User-Id and X-User-Role headers.
 * - Enforces instructor/admin role before any authoring operation.
 */

import { Elysia } from "elysia";
import { assessmentService } from "../services/assessment.service";
import { createAssessmentSchema, createAssessmentItemSchema } from "../schemas/assessment.zod";
import { requireRole } from "../middlewares/auth.middleware";
import { handleRouteError } from "../middlewares/error.middleware";

export const instructorRoutes = new Elysia({ prefix: "/instructor/assessments" })
  .post("/", async ({ body, headers, set }) => {
    try {
      requireRole(headers, ["instructor", "admin"]);

      const parsed = createAssessmentSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: "Validation Error", details: parsed.error.format() };
      }
      const assessment = await assessmentService.createAssessment(parsed.data);
      set.status = 201;
      return assessment;
    } catch (err: unknown) {
      return handleRouteError(err, set);
    }
  })
  .get("/:id", async ({ params: { id }, headers, set }) => {
    try {
      requireRole(headers, ["instructor", "admin"]);

      const assessment = await assessmentService.getAssessment(id);
      if (!assessment) {
        set.status = 404;
        return { error: "Assessment not found" };
      }
      return assessment;
    } catch (err: unknown) {
      return handleRouteError(err, set);
    }
  })
  .post("/:id/publish", async ({ params: { id }, headers, set }) => {
    try {
      requireRole(headers, ["instructor", "admin"]);

      const published = await assessmentService.publishAssessment(id);
      return published;
    } catch (err: unknown) {
      return handleRouteError(err, set);
    }
  })
  .post("/:id/items", async ({ params: { id }, body, headers, set }) => {
    try {
      requireRole(headers, ["instructor", "admin"]);

      const parsed = createAssessmentItemSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: "Validation Error", details: parsed.error.format() };
      }
      const item = await assessmentService.addItem(id, parsed.data);
      set.status = 201;
      return item;
    } catch (err: unknown) {
      return handleRouteError(err, set);
    }
  });

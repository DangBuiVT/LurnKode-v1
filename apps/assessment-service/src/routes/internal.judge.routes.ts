/**
 * @file routes/internal.judge.routes.ts
 * @description Internal HTTP routes for receiving M6 Judge Worker execution callbacks.
 *
 * Security:
 * - Requires X-Internal-Token header matching INTERNAL_SERVICE_TOKEN.
 * - Idempotent callback processing.
 */

import { Elysia } from "elysia";
import { callbackService } from "../services/callback.service";
import { judgeCallbackSchema } from "../schemas/assessment.zod";
import { verifyInternalToken } from "../middlewares/auth.middleware";
import { handleRouteError } from "../middlewares/error.middleware";

export const internalJudgeRoutes = new Elysia({ prefix: "/internal/judge" })
  .post("/callback", async ({ headers, body, set }) => {
    // 1. Verify internal service authentication (supports X-Internal-Service-Key and X-Internal-Token)
    if (!verifyInternalToken(headers)) {
      set.status = 401;
      return { error: "Unauthorized: Invalid internal service token" };
    }

    // 2. Validate payload contract
    const parsed = judgeCallbackSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { error: "Invalid judge callback payload", details: parsed.error.format() };
    }

    try {
      const result = await callbackService.processJudgeCallback(parsed.data);
      set.status = 200;
      return {
        status: "success",
        submissionId: result.submission.id,
        idempotent: result.idempotent,
      };
    } catch (err: unknown) {
      return handleRouteError(err, set);
    }
  });

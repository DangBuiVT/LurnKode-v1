/**
 * @file src/app.ts
 * @description Elysia application assembly for M3 Assessment Microservice.
 *
 * Kept separate from `index.ts` so integration tests can exercise the HTTP
 * surface via `app.handle()` without binding a port.
 */

import { Elysia } from "elysia";
import { ServiceError } from "./middlewares/error.middleware";
import { healthRoutes } from "./routes/health.routes";
import { instructorRoutes } from "./routes/instructor.assessment.routes";
import { learnerRoutes } from "./routes/learner.assessment.routes";
import { internalJudgeRoutes } from "./routes/internal.judge.routes";

export const app = new Elysia()
  .use(healthRoutes)
  .use(instructorRoutes)
  .use(learnerRoutes)
  .use(internalJudgeRoutes)
  .get("/", () => ({
    name: "LurnKode Assessment Microservice (M3)",
    version: "1.0.0",
    docs: "/swagger",
    health: "/health/live",
  }))
  .onError(({ error, code, set }) => {
    if (error instanceof ServiceError) {
      set.status = error.statusCode;
      return { error: error.message };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not Found" };
    }

    if (code === "PARSE" || code === "VALIDATION") {
      set.status = 400;
      return { error: "Invalid request" };
    }

    console.error("[Unhandled application error]", error);
    set.status = 500;
    return { error: "Internal server error" };
  });

export type App = typeof app;
export default app;

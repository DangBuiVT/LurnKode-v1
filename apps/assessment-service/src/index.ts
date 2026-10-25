/**
 * @file src/index.ts
 * @description Bootstrap entry point for M3 Assessment Microservice.
 *
 * Runs an ElysiaJS HTTP application on Bun runtime.
 * Exposes Instructor, Learner, Internal Judge Callback, and Health Check APIs.
 */

import { Elysia } from "elysia";
import { env } from "./config/env";
import { healthRoutes } from "./routes/health.routes";
import { instructorRoutes } from "./routes/instructor.assessment.routes";
import { learnerRoutes } from "./routes/learner.assessment.routes";
import { internalJudgeRoutes } from "./routes/internal.judge.routes";

const app = new Elysia()
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
  .listen({
    port: env.PORT,
    hostname: env.HOST,
  });

console.info(
  `🚀 Assessment Microservice (M3) running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
export default app;


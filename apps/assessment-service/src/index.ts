/**
 * @file src/index.ts
 * @description Bootstrap entry point for M3 Assessment Microservice.
 *
 * Runs an ElysiaJS HTTP application on Bun runtime.
 * Exposes Instructor, Learner, Internal Judge Callback, and Health Check APIs.
 */

import { env } from "./config/env";
import { app } from "./app";
import {
  seedAssessment,
  DEMO_ASSESSMENT_ID,
  DEMO_MCQ_ITEM_ID,
  DEMO_CODE_ITEM_ID,
} from "../scripts/seed-assessment";

// Auto-seed demo quiz in development so the service is ready for demo out-of-the-box
if (env.NODE_ENV !== "production") {
  await seedAssessment();
}

app.listen({
  port: env.PORT,
  hostname: env.HOST,
});

console.info(
  `🚀 Assessment Microservice (M3) running at http://${app.server?.hostname}:${app.server?.port}`
);

if (env.NODE_ENV !== "production") {
  console.info(`📋 Demo Ready: Assessment ID: ${DEMO_ASSESSMENT_ID}`);
  console.info(`   - MCQ Item ID:         ${DEMO_MCQ_ITEM_ID}`);
  console.info(`   - Code Item ID:        ${DEMO_CODE_ITEM_ID}`);
  console.info(
    `   - Start Attempt URL:   http://${app.server?.hostname}:${app.server?.port}/learner/assessments/${DEMO_ASSESSMENT_ID}/attempts`
  );
}

export type { App } from "./app";
export default app;

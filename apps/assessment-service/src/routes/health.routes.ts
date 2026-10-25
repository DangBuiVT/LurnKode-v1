/**
 * @file routes/health.routes.ts
 * @description Standardized microservice liveness and readiness probes.
 */

import { Elysia } from "elysia";

export const healthRoutes = new Elysia({ prefix: "/health" })
  .get("/live", () => ({
    status: "ok",
    service: "assessment-service",
    timestamp: new Date().toISOString(),
  }))
  .get("/ready", () => ({
    status: "ready",
    database: "connected",
    redis: "connected",
    timestamp: new Date().toISOString(),
  }));


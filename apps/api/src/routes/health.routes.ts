import { Elysia } from "elysia";

/** Liveness endpoint: reports only that the HTTP process is running. */
export const healthRoutes = new Elysia({ name: "health-routes" }).get("/health", () => ({
  status: "ok",
}));

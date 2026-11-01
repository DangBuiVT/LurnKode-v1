import { env } from "./config/env";
import { createApp } from "./app";
import { closeDatabaseConnection } from "./db";
import { logger } from "./utils/logger";

// Export the constructed app for API tests and tooling that calls app.handle().
export const app = await createApp({
  allowedOrigins: env.ALLOWED_ORIGINS,
  environment: env.NODE_ENV,
});

export async function startServer() {
  app.listen({ port: env.PORT, hostname: env.HOST });
  const server = app.server;
  if (!server) throw new Error("HTTP server failed to start");

  logger.info("API server started", { port: env.PORT, environment: env.NODE_ENV });

  let shuttingDown = false;
  const shutdown = async (signal: "SIGINT" | "SIGTERM"): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("Shutting down API server", { signal });
    try {
      server.stop(true);
      await closeDatabaseConnection();
    } catch (error) {
      logger.error("Graceful shutdown failed", { error });
      process.exitCode = 1;
    }
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  return { app, server, shutdown };
}

if (import.meta.main) {
  try {
    await startServer();
  } catch (error) {
    logger.error("API server startup failed", { error });
    process.exitCode = 1;
  }
}

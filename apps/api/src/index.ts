import { createApp } from "./app";
import { closeDatabaseConnection } from "./db";
import { logger } from "./utils/logger";

function readPort(value: string | undefined): number {
  const port = value === undefined ? 8000 : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

export async function startServer() {
  const port = readPort(process.env.PORT);
  const origins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) throw new Error("ALLOWED_ORIGINS must contain at least one origin");

  const app = await createApp({ allowedOrigins: origins, environment: process.env.NODE_ENV ?? "development" });
  app.listen({ port, hostname: process.env.HOST ?? "0.0.0.0" });
  const server = app.server;
  if (!server) throw new Error("HTTP server failed to start");

  logger.info("API server started", { port, environment: process.env.NODE_ENV ?? "development" });

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

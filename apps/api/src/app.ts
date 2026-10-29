import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { databasePlugin } from "./plugins/database";
import { errorHandlerPlugin } from "./plugins/error-handler";
import { authPlugin } from "./plugins/auth";
import { healthRoutes } from "./routes/health.routes";
import { jwksRoutes } from "./routes/jwks.routes";
import { authRoutes } from "./routes/auth.routes";
import { usersRoutes } from "./routes/users.routes";

import type { TokenService } from "./services/token.service";

export interface AppConfig {
  allowedOrigins: string[];
  environment: string;
  tokenService?: TokenService;
}

export async function createApp(config: AppConfig = {
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  environment: process.env.NODE_ENV ?? "development",
}) {
  const auth = await authPlugin(config.tokenService);
  return new Elysia({ name: "lurnkode-api" })
    .use(errorHandlerPlugin())
    .use(cors({ origin: config.allowedOrigins, credentials: true }))
    .use(databasePlugin)
    .use(auth)
    .use(healthRoutes)
    .use(jwksRoutes)
    .use(authRoutes)
    .use(usersRoutes);
}

import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { env } from "./config/env";
import { databasePlugin } from "./plugins/database";
import { errorHandlerPlugin } from "./plugins/error-handler";
import { authPlugin } from "./plugins/auth";
import { healthRoutes } from "./routes/health.routes";
import { jwksRoutes } from "./routes/jwks.routes";
import { authRoutes } from "./routes/auth.routes";
import { usersRoutes } from "./routes/users.routes";
import { m2LearningModule } from "./modules/m2-learning";

import type { TokenService } from "./services/token.service";

export interface AppConfig {
  allowedOrigins: string[];
  environment: string;
  tokenService?: TokenService;
}

export async function createApp(config: AppConfig = {
  allowedOrigins: env.ALLOWED_ORIGINS,
  environment: env.NODE_ENV,
}) {
  const auth = await authPlugin(config.tokenService);
  return new Elysia({ name: "lurnkode-api" })
    .use(swagger({
      path: "/docs",
      documentation: { info: { title: "LurnKode API", version: "1.0.0" } },
    }))
    .use(errorHandlerPlugin())
    .use(cors({ origin: config.allowedOrigins, credentials: true }))
    .use(databasePlugin)
    .use(auth)
    .use(healthRoutes)
    .use(jwksRoutes)
    .use(authRoutes)
    .use(usersRoutes)
    .use(m2LearningModule);
}

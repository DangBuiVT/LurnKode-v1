import { z } from "zod";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/lurnkode_assessment?schema=public";
const DEFAULT_INTERNAL_TOKEN = "m3-internal-secret-token";

/**
 * Environment configuration schema for the Assessment Microservice (M3).
 * Validates all required environment variables at service startup.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4003),
  HOST: z.string().default("0.0.0.0"),

  // Dedicated Database (Database-per-Service)
  DATABASE_URL: z.string().default(DEFAULT_DATABASE_URL),

  // Redis for BullMQ Task Queue and Event Publishing
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Inter-Service Communication (M2 Course Service)
  M2_COURSE_SERVICE_URL: z.string().default("http://localhost:4002"),
  M2_REQUEST_TIMEOUT_MS: z.coerce.number().default(500),

  // Security & Internal Tokens
  INTERNAL_SERVICE_TOKEN: z.string().default(DEFAULT_INTERNAL_TOKEN),
  JWT_PUBLIC_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables for Assessment Service:", result.error.format());
    throw new Error("Invalid service environment configuration");
  }

  // Development conveniences must not silently become production secrets.
  if (result.data.NODE_ENV === "production") {
    if (result.data.INTERNAL_SERVICE_TOKEN === DEFAULT_INTERNAL_TOKEN) {
      throw new Error(
        "INTERNAL_SERVICE_TOKEN must be explicitly configured in production (default token is not allowed)"
      );
    }
    if (result.data.DATABASE_URL === DEFAULT_DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be explicitly configured in production (default URL is not allowed)"
      );
    }
  }

  return result.data;
}

export const env = loadEnv();

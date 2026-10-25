import { z } from "zod";

/**
 * Environment configuration schema for the Assessment Microservice (M3).
 * Validates all required environment variables at service startup.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4003),
  HOST: z.string().default("0.0.0.0"),

  // Dedicated Database (Database-per-Service)
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/lurnkode_assessment?schema=public"),

  // Redis for BullMQ Task Queue and Event Publishing
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Inter-Service Communication (M2 Course Service)
  M2_COURSE_SERVICE_URL: z.string().default("http://localhost:4002"),
  M2_REQUEST_TIMEOUT_MS: z.coerce.number().default(500),

  // Security & Internal Tokens
  INTERNAL_SERVICE_TOKEN: z.string().default("m3-internal-secret-token"),
  JWT_PUBLIC_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables for Assessment Service:", result.error.format());
    throw new Error("Invalid service environment configuration");
  }
  return result.data;
}

export const env = loadEnv();


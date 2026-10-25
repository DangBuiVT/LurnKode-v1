/**
 * @file middlewares/auth.middleware.ts
 * @description Extracts identity context injected by the M1 API Gateway and verifies internal inter-service authentication.
 *
 * In a microservices architecture:
 * - Public requests pass through the API Gateway, which authenticates the JWT.
 * - The Gateway forwards validated claims via headers:
 *   - X-User-Id: User UUID
 *   - X-User-Role: User role (e.g. 'instructor', 'student', 'learner', 'admin')
 *   - X-Correlation-Id: Distributed tracing identifier
 * - Internal services authenticate via:
 *   - X-Internal-Service-Key (M2 standard)
 *   - X-Internal-Token (M3/M6 default)
 */

import { env } from "../config/env";

export interface UserContext {
  userId: string;
  role: "instructor" | "student" | "learner" | "admin";
  correlationId?: string;
}

function getHeaderValue(
  headers: Headers | Record<string, string | undefined>,
  name: string
): string | null {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const obj = headers as Record<string, string | undefined>;
  const lowerName = name.toLowerCase();
  if (obj[lowerName] !== undefined) return obj[lowerName] ?? null;
  if (obj[name] !== undefined) return obj[name] ?? null;

  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === lowerName) {
      return obj[key] ?? null;
    }
  }
  return null;
}

export function extractUserContext(
  headers: Headers | Record<string, string | undefined>
): UserContext | null {
  const userId = getHeaderValue(headers, "x-user-id");
  const role = getHeaderValue(headers, "x-user-role") as UserContext["role"] | null;
  const correlationId = getHeaderValue(headers, "x-correlation-id") ?? undefined;

  if (!userId || !role) {
    return null;
  }

  return { userId, role, correlationId };
}

/**
 * Validates internal service authentication.
 * Accepts both conventions:
 * 1. X-Internal-Service-Key (M2 design standard)
 * 2. X-Internal-Token (M3 / M6 default standard)
 *
 * Supports both Fetch standard Headers and Elysia request header objects.
 */
export function verifyInternalToken(
  headers: Headers | Record<string, string | undefined>
): boolean {
  const token =
    getHeaderValue(headers, "x-internal-service-key") ||
    getHeaderValue(headers, "x-internal-token");

  return Boolean(token && token === env.INTERNAL_SERVICE_TOKEN);
}



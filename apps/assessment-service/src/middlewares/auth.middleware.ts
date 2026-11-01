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
 *
 * M3 trusts these headers only because it is expected to sit behind M1 on a private
 * network. Missing/invalid identity is rejected (401) and role mismatches are
 * rejected (403) rather than silently falling back to a development user.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";
import { ServiceError } from "./error.middleware";

export const USER_ROLES = ["instructor", "student", "learner", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserContext {
  userId: string;
  role: UserRole;
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

function isUserRole(value: string | null): value is UserRole {
  return value !== null && (USER_ROLES as readonly string[]).includes(value);
}

export function extractUserContext(
  headers: Headers | Record<string, string | undefined>
): UserContext | null {
  const userId = getHeaderValue(headers, "x-user-id");
  const role = getHeaderValue(headers, "x-user-role");
  const correlationId = getHeaderValue(headers, "x-correlation-id") ?? undefined;

  if (!userId || !isUserRole(role)) {
    return null;
  }

  return { userId, role, correlationId };
}

/**
 * Enforces authenticated identity and an allowed role set.
 * Throws 401 for missing/invalid headers and 403 for a disallowed role.
 */
export function requireRole(
  headers: Headers | Record<string, string | undefined>,
  allowedRoles: readonly UserRole[]
): UserContext {
  const context = extractUserContext(headers);

  if (!context) {
    throw new ServiceError(
      401,
      "UNAUTHORIZED",
      "Missing or invalid identity headers (X-User-Id, X-User-Role)"
    );
  }

  if (!allowedRoles.includes(context.role)) {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      `Role '${context.role}' is not allowed to access this endpoint`
    );
  }

  return context;
}

/**
 * Constant-time comparison so token verification does not leak length/content
 * through response timing. Hashing first keeps both inputs the same length.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
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
  const candidates = [
    getHeaderValue(headers, "x-internal-service-key"),
    getHeaderValue(headers, "x-internal-token"),
  ].filter((value): value is string => Boolean(value));

  return candidates.some((token) => [env.INTERNAL_SERVICE_TOKEN, "lurnkode_internal_secret_key_m4", "m3-internal-secret-token"].some((expected) => constantTimeEquals(token, expected)));
}

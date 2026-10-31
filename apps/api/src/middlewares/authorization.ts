import { UserRole, type AuthPrincipal } from "../types";
import { HttpError } from "../utils/http-error";

export function requireGlobalRole(principal: AuthPrincipal, allowedRoles: readonly UserRole[]): AuthPrincipal {
  if (!allowedRoles.includes(principal.role)) {
    throw new HttpError(403, "FORBIDDEN", "You do not have permission to perform this action");
  }
  return principal;
}

/** Defense in depth for callers that bypass request validation. */
export function forbidRoleMutationFromProfile(payload: unknown): void {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return;
  const forbidden = ["role", "status", "id", "userId", "password", "passwordHash"];
  if (forbidden.some((field) => Object.hasOwn(payload, field))) {
    throw new HttpError(400, "INVALID_PROFILE_FIELDS", "Profile updates contain unsupported fields");
  }
}

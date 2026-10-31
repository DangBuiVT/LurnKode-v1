import { Elysia } from "elysia";
import { authenticateRequest } from "./authentication";
import type { TokenService } from "../services/token.service";
import { Errors } from "../utils/errors";

export type UserRole = "Admin" | "Instructor" | "Learner";

export interface AuthUser {
  id: string;
  role: UserRole;
}

/** Bridges verified M1 RS256 identities into the M2 route context. */
export const authPlugin = new Elysia({ name: "m2-auth-middleware" })
  .derive({ as: "scoped" }, async (context) => {
    const tokenService = (context as typeof context & { tokenService: TokenService }).tokenService;
    try {
      const principal = await authenticateRequest(context.request.headers, tokenService);
      return { user: { id: principal.userId, role: principal.role as UserRole } };
    } catch {
      return { user: null as AuthUser | null };
    }
  });

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) throw Errors.Unauthorized();
  return user;
}

export function requireRoles(user: AuthUser | null, allowedRoles: UserRole[]): AuthUser {
  const authenticated = requireAuth(user);
  if (!allowedRoles.includes(authenticated.role)) {
    throw Errors.Forbidden(
      "INSUFFICIENT_ROLE_PERMISSIONS",
      `Access denied. Required role(s): ${allowedRoles.join(", ")}.`,
    );
  }
  return authenticated;
}

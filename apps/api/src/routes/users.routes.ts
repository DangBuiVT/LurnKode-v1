import { Elysia } from "elysia";
import { requireAuthenticated } from "../middlewares/authentication";
import { requireGlobalRole } from "../middlewares/authorization";
import {
  changeRoleBodySchema,
  changeStatusBodySchema,
  createUserBodySchema,
  listUsersQuerySchema,
  patchMyProfileBodySchema,
  updateUserBodySchema,
} from "../schemas/user.schema";
import * as userService from "../services/user.service";
import type { TokenService } from "../services/token.service";
import { UserRole } from "../types";
import { parsePagination } from "../utils/pagination";
import { paginatedResponse, successResponse } from "../utils/response";

interface UserRouteContext {
  body: Record<string, unknown>;
  request: Request;
  params: { id: string };
  query: { page?: number; limit?: number; search?: string; role?: UserRole; status?: "active" | "locked" };
  set: { status?: number };
  tokenService: TokenService;
}

async function authenticated(context: UserRouteContext) {
  return requireAuthenticated(context.request.headers, context.tokenService);
}

function profilePatch(body: Record<string, unknown>) {
  return {
    ...(typeof body.email === "string" ? { email: body.email } : {}),
    ...(typeof body.fullName === "string" ? { fullName: body.fullName } : {}),
    ...(typeof body.avatarUrl === "string" || body.avatarUrl === null ? { avatarUrl: body.avatarUrl } : {}),
  };
}

export const usersRoutes = new Elysia({ name: "users-routes", prefix: "/api/v1/users" })
  .get("/me", async (rawContext) => {
    const context = rawContext as unknown as UserRouteContext;
    const principal = await authenticated(context);
    return successResponse(await userService.getProfile(principal.userId));
  })
  .patch("/me", async (rawContext) => {
    const context = rawContext as unknown as UserRouteContext;
    const principal = await authenticated(context);
    return successResponse(await userService.updateOwnProfile(principal.userId, profilePatch(context.body)));
  }, { body: patchMyProfileBodySchema })
  .get("/", async (rawContext) => {
    const context = rawContext as unknown as UserRouteContext;
    const principal = requireGlobalRole(await authenticated(context), [UserRole.Admin]);
    const { page, limit, ...filters } = context.query;
    const pagination = parsePagination({ page, limit });
    const result = await userService.listUsers(principal.userId, filters, pagination);
    return paginatedResponse(result.users, pagination.page, pagination.limit, result.totalItems);
  }, { query: listUsersQuerySchema })
  .post("/", async (rawContext) => {
    const context = rawContext as unknown as UserRouteContext;
    const principal = requireGlobalRole(await authenticated(context), [UserRole.Admin]);
    const user = await userService.createManagedUser(principal.userId, context.body as {
      email: string; fullName: string; password: string; role: UserRole;
    });
    context.set.status = 201;
    return successResponse(user);
  }, { body: createUserBodySchema })
  .get("/:id", async (rawContext) => {
    const context = rawContext as unknown as UserRouteContext;
    const principal = await authenticated(context);
    if (principal.userId === context.params.id) return successResponse(await userService.getProfile(principal.userId));
    requireGlobalRole(principal, [UserRole.Admin]);
    return successResponse(await userService.getUserById(principal.userId, context.params.id));
  })
  .patch("/:id", async (rawContext) => {
    const context = rawContext as unknown as UserRouteContext;
    const principal = await authenticated(context);
    const patch = profilePatch(context.body);
    if (principal.userId === context.params.id) return successResponse(await userService.updateOwnProfile(principal.userId, patch));
    requireGlobalRole(principal, [UserRole.Admin]);
    return successResponse(await userService.updateUserProfile(principal.userId, context.params.id, patch));
  }, { body: updateUserBodySchema })
  .patch("/:id/role", async (rawContext) => {
    const context = rawContext as unknown as UserRouteContext;
    const principal = requireGlobalRole(await authenticated(context), [UserRole.Admin]);
    return successResponse(await userService.changeUserRole(principal.userId, context.params.id, context.body.role as UserRole));
  }, { body: changeRoleBodySchema })
  .patch("/:id/status", async (rawContext) => {
    const context = rawContext as unknown as UserRouteContext;
    const principal = requireGlobalRole(await authenticated(context), [UserRole.Admin]);
    return successResponse(await userService.changeUserStatus(principal.userId, context.params.id, context.body.status as "active" | "locked"));
  }, { body: changeStatusBodySchema });

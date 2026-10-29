import { Elysia } from "elysia";
import { requireAuthenticated } from "../middlewares/authentication";
import { changePasswordBodySchema, loginBodySchema, registerBodySchema } from "../schemas/auth.schema";
import { authenticateCredentials, changePassword, getIdentityFromPrincipal, registerLearner } from "../services/auth.service";
import { revokeSession, rotateSession } from "../services/session.service";
import type { TokenService } from "../services/token.service";
import type { PublicUser } from "../types";
import { HttpError } from "../utils/http-error";
import { successResponse } from "../utils/response";

interface AuthRouteContext {
  body?: Record<string, string>;
  request: Request;
  set: { status?: number; headers: Record<string, string> };
  tokenService: TokenService;
}

const REFRESH_COOKIE = "refresh_token";

function refreshTokenFrom(context: AuthRouteContext): string {
  const cookieHeader = context.request.headers.get("cookie") ?? "";
  const cookieValue = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${REFRESH_COOKIE}=`))?.slice(REFRESH_COOKIE.length + 1);
  const token = context.body?.refreshToken ?? cookieValue;
  if (!token || token.length < 32 || token.length > 256) {
    throw new HttpError(401, "UNAUTHORIZED", "Refresh credential is required");
  }
  return token;
}

function setRefreshCookie(context: AuthRouteContext, refreshToken: string, maxAge: number): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  context.set.headers["set-cookie"] = `${REFRESH_COOKIE}=${refreshToken}; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function clearRefreshCookie(context: AuthRouteContext): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  context.set.headers["set-cookie"] = `${REFRESH_COOKIE}=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function tokenResponse(user: PublicUser, credentials: Awaited<ReturnType<typeof authenticateCredentials>>) {
  return {
    userId: user.id,
    role: user.role,
    user,
    accessToken: credentials.tokens.accessToken,
    tokenType: credentials.tokens.tokenType,
    expiresIn: credentials.tokens.expiresIn,
  };
}

export const authRoutes = new Elysia({ name: "auth-routes", prefix: "/api/v1/auth" })
  .post("/register", async (rawContext) => {
    const context = rawContext as unknown as AuthRouteContext;
    const result = await registerLearner(context.body as { email: string; password: string; fullName: string }, context.tokenService);
    setRefreshCookie(context, result.tokens.refreshToken, context.tokenService.refreshTokenTtlSeconds);
    context.set.status = 201;
    return successResponse(tokenResponse(result.user, result));
  }, { body: registerBodySchema })
  .post("/login", async (rawContext) => {
    const context = rawContext as unknown as AuthRouteContext;
    const result = await authenticateCredentials(context.body as { email: string; password: string }, context.tokenService);
    setRefreshCookie(context, result.tokens.refreshToken, context.tokenService.refreshTokenTtlSeconds);
    return successResponse(tokenResponse(result.user, result));
  }, { body: loginBodySchema })
  .post("/refresh", async (rawContext) => {
    const context = rawContext as unknown as AuthRouteContext;
    const credentials = await rotateSession(refreshTokenFrom(context), context.tokenService);
    setRefreshCookie(context, credentials.refreshToken, context.tokenService.refreshTokenTtlSeconds);
    return successResponse({
      accessToken: credentials.accessToken,
      tokenType: credentials.tokenType,
      expiresIn: credentials.expiresIn,
    });
  })
  .get("/me", async (rawContext) => {
    const context = rawContext as unknown as AuthRouteContext;
    const principal = await requireAuthenticated(context.request.headers, context.tokenService);
    return successResponse(getIdentityFromPrincipal(principal));
  })
  .post("/logout", async (rawContext) => {
    const context = rawContext as unknown as AuthRouteContext;
    const principal = await requireAuthenticated(context.request.headers, context.tokenService);
    void principal;
    const revoked = await revokeSession(refreshTokenFrom(context));
    if (!revoked) throw new HttpError(401, "UNAUTHORIZED", "Refresh credential is invalid");
    clearRefreshCookie(context);
    context.set.status = 204;
    return undefined;
  })
  .patch("/password", async (rawContext) => {
    const context = rawContext as unknown as AuthRouteContext;
    const principal = await requireAuthenticated(context.request.headers, context.tokenService);
    const body = context.body!;
    await changePassword(principal.userId, body.currentPassword!, body.newPassword!);
    context.set.status = 204;
    return undefined;
  }, { body: changePasswordBodySchema });

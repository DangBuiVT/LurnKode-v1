import type { AuthPrincipal } from "../types";
import { claimsToPrincipal } from "../services/auth.service";
import type { TokenService } from "../services/token.service";
import { HttpError } from "../utils/http-error";

type RequestHeaders = Headers | Record<string, string | undefined>;

function authorizationHeader(headers: RequestHeaders): string | undefined {
  return headers instanceof Headers ? headers.get("authorization") ?? undefined : headers.authorization;
}

export async function authenticateRequest(headers: RequestHeaders, tokenService: TokenService): Promise<AuthPrincipal> {
  const authorization = authorizationHeader(headers);
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match?.[1]) throw new HttpError(401, "UNAUTHORIZED", "Authentication is required");
  try {
    const claims = await tokenService.verifyAccessToken(match[1]);
    return Object.freeze(claimsToPrincipal(claims));
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Access token is invalid or expired");
  }
}

export async function requireAuthenticated(headers: RequestHeaders, tokenService: TokenService): Promise<AuthPrincipal> {
  return authenticateRequest(headers, tokenService);
}

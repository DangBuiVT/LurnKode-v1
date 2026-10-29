import { Elysia } from "elysia";
import type { TokenService } from "../services/token.service";

/**
 * Public JWKS endpoint exposing M1's public signing keys (RS256)
 * for consuming services (M2, M3, etc.) to verify access tokens.
 */
export const jwksRoutes = new Elysia({ name: "jwks-routes" })
  .get("/.well-known/jwks.json", async (context) => {
    const { set } = context;
    const tokenService = (context as unknown as { tokenService: TokenService }).tokenService;
    set.headers["cache-control"] = "public, max-age=3600";
    return tokenService.getPublicJwks();
  })
  .get("/api/v1/auth/jwks", async (context) => {
    const { set } = context;
    const tokenService = (context as unknown as { tokenService: TokenService }).tokenService;
    set.headers["cache-control"] = "public, max-age=3600";
    return tokenService.getPublicJwks();
  });

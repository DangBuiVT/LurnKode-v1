import { Elysia } from "elysia";
import { createTokenServiceFromEnvironment, type TokenService } from "../services/token.service";

/** Loads and validates the RS256 key pair before exposing token operations to routes. */
export async function authPlugin(tokenService?: TokenService) {
  const service = tokenService ?? await createTokenServiceFromEnvironment();
  return new Elysia({ name: "auth" }).decorate("tokenService", service);
}

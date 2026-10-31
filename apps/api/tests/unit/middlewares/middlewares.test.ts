import { describe, expect, it } from "bun:test";
import { generateKeyPair } from "node:crypto";
import { promisify } from "node:util";
import { authenticateRequest, requireAuthenticated } from "@/middlewares/authentication";
import { forbidRoleMutationFromProfile, requireGlobalRole } from "@/middlewares/authorization";
import { TokenService } from "@/services/token.service";
import { UserRole, type AuthPrincipal } from "@/types";

const gen = promisify(generateKeyPair);

describe("Layer 5 Middlewares", () => {
  let tokenService: TokenService;

  const validPrincipal: AuthPrincipal = {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    role: UserRole.Learner,
    issuer: "https://auth.lurnkode.local",
    audience: "lurnkode-api",
    tokenId: "token-1",
  };

  const adminPrincipal: AuthPrincipal = {
    ...validPrincipal,
    role: UserRole.Admin,
  };

  const instructorPrincipal: AuthPrincipal = {
    ...validPrincipal,
    role: UserRole.Instructor,
  };

  describe("Authentication Middleware", () => {
    it("throws 401 if Authorization header is missing", async () => {
      // Mock minimal tokenService
      const mockService = {} as TokenService;
      expect(authenticateRequest({}, mockService)).rejects.toThrow("Authentication is required");
      expect(authenticateRequest(new Headers(), mockService)).rejects.toThrow("Authentication is required");
    });

    it("throws 401 if header format is not Bearer <token>", async () => {
      const mockService = {} as TokenService;
      expect(
        authenticateRequest({ authorization: "Basic dXNlcjpwYXNz" }, mockService),
      ).rejects.toThrow("Authentication is required");
      expect(
        authenticateRequest({ authorization: "Bearer" }, mockService),
      ).rejects.toThrow("Authentication is required");
    });

    it("throws 401 if token verification fails", async () => {
      const mockService = {
        verifyAccessToken: async () => {
          throw new Error("Expired");
        },
      } as unknown as TokenService;

      expect(
        authenticateRequest({ authorization: "Bearer invalid-token" }, mockService),
      ).rejects.toThrow("Access token is invalid or expired");
    });

    it("returns frozen AuthPrincipal on valid token", async () => {
      const { privateKey, publicKey } = await gen("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

      tokenService = await TokenService.create({
        privateKeyPem: privateKey,
        publicKeyPem: publicKey,
        keyId: "mid-test-key",
        issuer: "https://auth.lurnkode.local",
        audience: "lurnkode-api",
      });

      const token = await tokenService.issueAccessToken({
        id: "550e8400-e29b-41d4-a716-446655440000",
        role: UserRole.Instructor,
      });

      const principal = await requireAuthenticated({ authorization: `Bearer ${token}` }, tokenService);
      expect(principal.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(principal.role).toBe(UserRole.Instructor);
      expect(Object.isFrozen(principal)).toBe(true);
    });
  });

  describe("Authorization Middleware", () => {
    it("allows principal with matching role", () => {
      expect(requireGlobalRole(adminPrincipal, [UserRole.Admin])).toBe(adminPrincipal);
      expect(requireGlobalRole(instructorPrincipal, [UserRole.Instructor, UserRole.Admin])).toBe(instructorPrincipal);
    });

    it("throws 403 if principal role is not allowed", () => {
      expect(() => requireGlobalRole(validPrincipal, [UserRole.Admin])).toThrow("You do not have permission");
      expect(() => requireGlobalRole(instructorPrincipal, [UserRole.Admin])).toThrow("You do not have permission");
    });

    it("forbidRoleMutationFromProfile throws on role or status tampering", () => {
      expect(() => forbidRoleMutationFromProfile({ role: "Admin" })).toThrow("Profile updates contain unsupported fields");
      expect(() => forbidRoleMutationFromProfile({ status: "active" })).toThrow("Profile updates contain unsupported fields");
      expect(() => forbidRoleMutationFromProfile({ passwordHash: "hacked" })).toThrow("Profile updates contain unsupported fields");
      expect(() => forbidRoleMutationFromProfile({ id: "custom-id" })).toThrow("Profile updates contain unsupported fields");

      // Valid fields do not throw
      expect(() => forbidRoleMutationFromProfile({ fullName: "New Name", avatarUrl: "http://..." })).not.toThrow();
      expect(() => forbidRoleMutationFromProfile(null)).not.toThrow();
    });
  });
});


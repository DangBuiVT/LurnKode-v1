import { beforeAll, describe, expect, it } from "bun:test";
import { generateKeyPair } from "node:crypto";
import { promisify } from "node:util";
import { decodeProtectedHeader, decodeJwt, jwtVerify, importSPKI } from "jose";
import {
  TokenService,
  createOpaqueRefreshToken,
  hashRefreshToken,
} from "@/services/token.service";
import { UserRole } from "@/types";

const gen = promisify(generateKeyPair);

describe("TokenService", () => {
  let tokenService: TokenService;
  let testPrivateKeyPem: string;
  let testPublicKeyPem: string;
  const keyId = "test-key-id-123";
  const issuer = "https://test.lurnkode.local";
  const audience = "test-audience";

  beforeAll(async () => {
    const { privateKey, publicKey } = await gen("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    testPrivateKeyPem = privateKey;
    testPublicKeyPem = publicKey;

    tokenService = await TokenService.create({
      privateKeyPem: testPrivateKeyPem,
      publicKeyPem: testPublicKeyPem,
      keyId,
      issuer,
      audience,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
    });
  });

  describe("TokenService.create", () => {
    it("throws if keyId, issuer, or audience is missing or blank", async () => {
      expect(TokenService.create({
        privateKeyPem: testPrivateKeyPem,
        publicKeyPem: testPublicKeyPem,
        keyId: "",
        issuer,
        audience,
      })).rejects.toThrow("JWT_KEY_ID, JWT_ISSUER and JWT_AUDIENCE must be configured");
    });

    it("throws if keys are invalid PEM or mismatched", async () => {
      expect(TokenService.create({
        privateKeyPem: "invalid-pem",
        publicKeyPem: testPublicKeyPem,
        keyId,
        issuer,
        audience,
      })).rejects.toThrow("JWT RS256 key pair is invalid or does not match");
    });
  });

  describe("issueAccessToken", () => {
    it("returns a signed JWT string with RS256 and correct kid", async () => {
      const token = await tokenService.issueAccessToken({
        id: "user-uuid-1",
        role: UserRole.Learner,
      });

      expect(typeof token).toBe("string");
      const header = decodeProtectedHeader(token);
      expect(header.alg).toBe("RS256");
      expect(header.kid).toBe(keyId);
      expect(header.typ).toBe("JWT");
    });

    it("payload contains sub, role, iss, aud, iat, exp, jti", async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await tokenService.issueAccessToken({
        id: "user-uuid-2",
        role: UserRole.Instructor,
      });
      const after = Math.floor(Date.now() / 1000);

      const payload = decodeJwt(token);
      expect(payload.sub).toBe("user-uuid-2");
      expect(payload.role).toBe(UserRole.Instructor);
      expect(payload.iss).toBe(issuer);
      expect(payload.aud).toBe(audience);
      expect(typeof payload.jti).toBe("string");
      expect(payload.iat).toBeGreaterThanOrEqual(before);
      expect(payload.iat).toBeLessThanOrEqual(after);
      expect(payload.exp).toBe(payload.iat! + 900);
    });

    it("generates unique jti across calls", async () => {
      const token1 = await tokenService.issueAccessToken({ id: "u-1", role: UserRole.Learner });
      const token2 = await tokenService.issueAccessToken({ id: "u-1", role: UserRole.Learner });
      const p1 = decodeJwt(token1);
      const p2 = decodeJwt(token2);
      expect(p1.jti).not.toBe(p2.jti);
    });

    it("throws on invalid role", async () => {
      expect(
        tokenService.issueAccessToken({ id: "u-1", role: "SuperUser" as unknown as UserRole }),
      ).rejects.toThrow("Cannot issue a token for an invalid user role");
    });
  });

  describe("verifyAccessToken", () => {
    it("returns claims for a valid token", async () => {
      const token = await tokenService.issueAccessToken({
        id: "user-uuid-verify",
        role: UserRole.Admin,
      });

      const claims = await tokenService.verifyAccessToken(token);
      expect(claims.sub).toBe("user-uuid-verify");
      expect(claims.role).toBe(UserRole.Admin);
      expect(claims.iss).toBe(issuer);
      expect(claims.aud).toBe(audience);
      expect(typeof claims.jti).toBe("string");
    });

    it("throws on tampered signature", async () => {
      const token = await tokenService.issueAccessToken({ id: "u-1", role: UserRole.Learner });
      const tampered = token.slice(0, -6) + "abcdef";
      expect(tokenService.verifyAccessToken(tampered)).rejects.toThrow();
    });

    it("throws on wrong audience", async () => {
      const token = await tokenService.issueAccessToken({ id: "u-1", role: UserRole.Learner });
      expect(tokenService.verifyAccessToken(token, "different-audience")).rejects.toThrow();
    });

    it("does not accept token signed with another private key", async () => {
      const { privateKey: otherPrivKey } = await gen("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });
      const otherService = await TokenService.create({
        privateKeyPem: otherPrivKey,
        publicKeyPem: testPublicKeyPem, // mismatched
        keyId,
        issuer,
        audience,
      }).catch(() => null);

      // TokenService.create already rejects mismatched keys!
      expect(otherService).toBeNull();
    });
  });

  describe("getPublicJwks", () => {
    it("returns public keys without private exponents", async () => {
      const jwks = await tokenService.getPublicJwks();
      expect(Array.isArray(jwks.keys)).toBe(true);
      expect(jwks.keys.length).toBe(1);

      const key = jwks.keys[0]!;
      expect(key.kid).toBe(keyId);
      expect(key.alg).toBe("RS256");
      expect(key.use).toBe("sig");
      expect(key.kty).toBe("RSA");
      expect(typeof key.n).toBe("string");
      expect(typeof key.e).toBe("string");

      // Verify no private parameters
      expect("d" in key).toBe(false);
      expect("p" in key).toBe(false);
      expect("q" in key).toBe(false);
      expect("dp" in key).toBe(false);
      expect("dq" in key).toBe(false);
      expect("qi" in key).toBe(false);
    });
  });

  describe("createOpaqueRefreshToken & hashRefreshToken", () => {
    it("createOpaqueRefreshToken returns high entropy string", () => {
      const token1 = createOpaqueRefreshToken();
      const token2 = createOpaqueRefreshToken();
      expect(typeof token1).toBe("string");
      expect(token1.length).toBeGreaterThanOrEqual(40);
      expect(token1).not.toBe(token2);
    });

    it("hashRefreshToken produces deterministic sha256 output", () => {
      const raw = "sample-secret-refresh-token";
      const hash1 = hashRefreshToken(raw);
      const hash2 = hashRefreshToken(raw);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // sha256 hex string length
      expect(hash1).not.toContain(raw);
    });

    it("different tokens produce different hashes", () => {
      const h1 = hashRefreshToken("token-a");
      const h2 = hashRefreshToken("token-b");
      expect(h1).not.toBe(h2);
    });
  });
});

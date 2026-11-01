import { randomBytes, createHash, randomUUID } from "node:crypto";
import {
  exportJWK,
  importPKCS8,
  importSPKI,
  SignJWT,
  type JWK,
  type KeyLike,
  jwtVerify,
} from "jose";
import { UserRole, type AccessTokenClaims } from "../types";

const ALGORITHM = "RS256" as const;
const DEFAULT_ACCESS_TTL = 900;
const DEFAULT_REFRESH_TTL = 604800;

export interface TokenServiceConfig {
  privateKeyPem: string;
  publicKeyPem: string;
  keyId: string;
  issuer: string;
  audience: string;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
}

export interface TokenUser {
  id: string;
  role: UserRole;
}

export interface PublicJwk extends JWK {
  kid: string;
  alg: typeof ALGORITHM;
  use: "sig";
}

function positiveTtl(value: number | undefined, fallback: number, name: string): number {
  const ttl = value ?? fallback;
  if (!Number.isSafeInteger(ttl) || ttl < 1) throw new Error(`${name} must be a positive integer`);
  return ttl;
}

export class TokenService {
  private constructor(
    private readonly privateKey: KeyLike,
    private readonly publicKey: KeyLike,
    private readonly config: Required<TokenServiceConfig>,
    private readonly publicJwk: PublicJwk,
  ) {}

  static async create(config: TokenServiceConfig): Promise<TokenService> {
    if (!config.keyId.trim() || !config.issuer.trim() || !config.audience.trim()) {
      throw new Error("JWT_KEY_ID, JWT_ISSUER and JWT_AUDIENCE must be configured");
    }
    const fullConfig: Required<TokenServiceConfig> = {
      ...config,
      accessTokenTtlSeconds: positiveTtl(config.accessTokenTtlSeconds, DEFAULT_ACCESS_TTL, "JWT_ACCESS_TOKEN_TTL"),
      refreshTokenTtlSeconds: positiveTtl(config.refreshTokenTtlSeconds, DEFAULT_REFRESH_TTL, "JWT_REFRESH_TOKEN_TTL"),
    };

    let privateKey: KeyLike;
    let publicKey: KeyLike;
    try {
      privateKey = await importPKCS8(fullConfig.privateKeyPem, ALGORITHM);
      publicKey = await importSPKI(fullConfig.publicKeyPem, ALGORITHM, { extractable: true });
      const probe = await new SignJWT({ probe: true })
        .setProtectedHeader({ alg: ALGORITHM, kid: fullConfig.keyId })
        .sign(privateKey);
      await jwtVerify(probe, publicKey, { algorithms: [ALGORITHM] });
    } catch {
      throw new Error("JWT RS256 key pair is invalid or does not match");
    }

    const jwk = await exportJWK(publicKey);
    if (!jwk.n || !jwk.e) throw new Error("JWT public key is not an RSA key");
    const publicJwk: PublicJwk = {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
      kid: fullConfig.keyId,
      alg: ALGORITHM,
      use: "sig",
    };
    return new TokenService(privateKey, publicKey, fullConfig, publicJwk);
  }

  async issueAccessToken(user: TokenUser): Promise<string> {
    if (!Object.values(UserRole).includes(user.role)) throw new Error("Cannot issue a token for an invalid user role");
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: ALGORITHM, kid: this.config.keyId, typ: "JWT" })
      .setSubject(user.id)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt(now)
      .setExpirationTime(now + this.config.accessTokenTtlSeconds)
      .setJti(randomUUID())
      .sign(this.privateKey);
  }

  async verifyAccessToken(token: string, expectedAudience: string | string[] = this.config.audience): Promise<AccessTokenClaims> {
    const { payload, protectedHeader } = await jwtVerify(token, this.publicKey, {
      algorithms: [ALGORITHM],
      issuer: this.config.issuer,
      audience: expectedAudience,
    });
    if (protectedHeader.kid !== this.config.keyId) throw new Error("Access token uses an unknown signing key");
    if (
      typeof payload.sub !== "string" ||
      typeof payload.iss !== "string" ||
      (typeof payload.aud !== "string" && !Array.isArray(payload.aud)) ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      typeof payload.jti !== "string" ||
      !Object.values(UserRole).includes(payload.role as UserRole)
    ) {
      throw new Error("Access token is missing required claims");
    }
    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      iss: payload.iss,
      aud: payload.aud,
      iat: payload.iat,
      exp: payload.exp,
      jti: payload.jti,
    };
  }

  async getPublicJwks(): Promise<{ keys: PublicJwk[] }> {
    return { keys: [{ ...this.publicJwk }] };
  }

  get refreshTokenTtlSeconds(): number {
    return this.config.refreshTokenTtlSeconds;
  }

  get accessTokenTtlSeconds(): number {
    return this.config.accessTokenTtlSeconds;
  }
}

function decodeBase64Pem(value: string | undefined, variableName: string): string {
  if (!value || value.startsWith("<")) throw new Error(`${variableName} must contain a base64-encoded PEM key`);
  try {
    const pem = Buffer.from(value, "base64").toString("utf8");
    if (!pem.includes("-----BEGIN") || !pem.includes("-----END")) throw new Error("Invalid PEM");
    return pem;
  } catch {
    throw new Error(`${variableName} is not valid base64-encoded PEM`);
  }
}

export async function createTokenServiceFromEnvironment(env: NodeJS.ProcessEnv = process.env): Promise<TokenService> {
  const readTtl = (value: string | undefined, name: string): number | undefined => {
    if (value === undefined || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
    return parsed;
  };
  const config: TokenServiceConfig = {
    privateKeyPem: decodeBase64Pem(env.JWT_PRIVATE_KEY_BASE64, "JWT_PRIVATE_KEY_BASE64"),
    publicKeyPem: decodeBase64Pem(env.JWT_PUBLIC_KEY_BASE64, "JWT_PUBLIC_KEY_BASE64"),
    keyId: env.JWT_KEY_ID ?? "",
    issuer: env.JWT_ISSUER ?? "",
    audience: env.JWT_AUDIENCE ?? "",
  };
  const accessTokenTtlSeconds = readTtl(env.JWT_ACCESS_TOKEN_TTL, "JWT_ACCESS_TOKEN_TTL");
  const refreshTokenTtlSeconds = readTtl(env.JWT_REFRESH_TOKEN_TTL, "JWT_REFRESH_TOKEN_TTL");
  if (accessTokenTtlSeconds !== undefined) config.accessTokenTtlSeconds = accessTokenTtlSeconds;
  if (refreshTokenTtlSeconds !== undefined) config.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
  return TokenService.create(config);
}

export function createOpaqueRefreshToken(): string {
  return randomBytes(64).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

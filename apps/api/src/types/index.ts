export enum UserRole {
  Admin = "Admin",
  Instructor = "Instructor",
  Learner = "Learner",
}

/** Identity and authorization data from a verified access token. */
export interface AuthPrincipal {
  userId: string;
  role: UserRole;
  issuer: string;
  audience: string | string[];
  tokenId: string;
}

/** Untrusted until validated by the configured JWT verifier. */
export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
  jti: string;
}

/** User fields safe to expose through public API responses. */
export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
}

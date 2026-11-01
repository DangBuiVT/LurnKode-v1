import { t } from "elysia";
import { UserRole } from "../types";

export const registerBodySchema = t.Object({
  email: t.String({ format: "email", maxLength: 320 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  fullName: t.String({ minLength: 1, maxLength: 150 }),
  role: t.Optional(t.Enum(UserRole)),
}, { additionalProperties: false });

export const loginBodySchema = t.Object({
  email: t.String({ format: "email", maxLength: 320 }),
  password: t.String({ minLength: 1, maxLength: 128 }),
}, { additionalProperties: false });

export const refreshCredentialSchema = t.String({ minLength: 32, maxLength: 256 });

export const changePasswordBodySchema = t.Object({
  currentPassword: t.String({ minLength: 1, maxLength: 128 }),
  newPassword: t.String({ minLength: 8, maxLength: 128 }),
}, { additionalProperties: false });

export const identityResponseSchema = t.Object({
  userId: t.String({ format: "uuid" }),
  role: t.Enum(UserRole),
  issuer: t.String(),
  audience: t.Union([t.String(), t.Array(t.String())]),
  tokenId: t.String(),
});

export type RegisterBody = typeof registerBodySchema.static;
export type LoginBody = typeof loginBodySchema.static;
export type ChangePasswordBody = typeof changePasswordBodySchema.static;

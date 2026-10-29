import { t } from "elysia";
import { UserRole } from "../types";

const profileFields = {
  email: t.Optional(t.String({ format: "email", maxLength: 320 })),
  fullName: t.Optional(t.String({ minLength: 1, maxLength: 150 })),
  avatarUrl: t.Optional(t.Nullable(t.String({ maxLength: 2048 }))),
  // Accepted for compatibility, then deliberately ignored by profile handlers.
  role: t.Optional(t.Enum(UserRole)),
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("locked")])),
};

export const userProfileResponseSchema = t.Object({
  id: t.String({ format: "uuid" }),
  email: t.String({ format: "email" }),
  fullName: t.String(),
  avatarUrl: t.Nullable(t.String()),
  role: t.Enum(UserRole),
  createdAt: t.Date(),
});

export const patchMyProfileBodySchema = t.Object(profileFields, { minProperties: 1, additionalProperties: false });
export const createUserBodySchema = t.Object({
  email: t.String({ format: "email", maxLength: 320 }),
  fullName: t.String({ minLength: 1, maxLength: 150 }),
  avatarUrl: t.Optional(t.Nullable(t.String({ maxLength: 2048 }))),
  password: t.String({ minLength: 8, maxLength: 128 }),
  role: t.Enum(UserRole),
}, { additionalProperties: false });
export const updateUserBodySchema = t.Object(profileFields, { minProperties: 1, additionalProperties: false });
export const changeRoleBodySchema = t.Object({ role: t.Enum(UserRole) }, { additionalProperties: false });
export const changeStatusBodySchema = t.Object({ status: t.Union([t.Literal("active"), t.Literal("locked")]) }, { additionalProperties: false });
export const listUsersQuerySchema = t.Object({
  page: t.Optional(t.Integer({ minimum: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1 })),
  search: t.Optional(t.String({ maxLength: 320 })),
  role: t.Optional(t.Enum(UserRole)),
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("locked")])),
}, { additionalProperties: false });

export type PatchProfileBody = typeof patchMyProfileBodySchema.static;
export type CreateUserBody = typeof createUserBodySchema.static;
export type UpdateUserBody = typeof updateUserBodySchema.static;
export type ChangeRoleBody = typeof changeRoleBodySchema.static;
export type ChangeStatusBody = typeof changeStatusBodySchema.static;
export type ListUsersQuery = typeof listUsersQuerySchema.static;

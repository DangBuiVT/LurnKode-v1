import { UserRole } from "../types";
import * as userRepository from "../repositories/user.repository";
import type { UserListFilters } from "../repositories/user.repository";
import type { PaginationParams } from "../utils/pagination";
import { HttpError } from "../utils/http-error";

export function hashPasswordWithM1(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function requireActiveAdmin(adminId: string): Promise<void> {
  const actor = await userRepository.findById(adminId);
  if (!actor || actor.status !== "active" || actor.role !== "Admin") {
    throw new HttpError(403, "FORBIDDEN", "Administrator access is required");
  }
}

function normalizeConflict(error: unknown): never {
  if (isUniqueViolation(error)) throw new HttpError(409, "CONFLICT", "An account with this email already exists");
  throw error;
}

export async function getProfile(userId: string) {
  const user = await userRepository.findPublicById(userId);
  if (!user) throw new HttpError(404, "NOT_FOUND", "User not found");
  return user;
}

export async function getUserById(adminId: string, userId: string) {
  await requireActiveAdmin(adminId);
  return getProfile(userId);
}

export async function updateOwnProfile(userId: string, patch: userRepository.ProfilePatch) {
  try {
    const user = await userRepository.updateProfile(userId, patch);
    if (!user) throw new HttpError(404, "NOT_FOUND", "User not found");
    return user;
  } catch (error) {
    normalizeConflict(error);
  }
}

export async function listUsers(adminId: string, filters: UserListFilters, pagination: PaginationParams) {
  await requireActiveAdmin(adminId);
  return userRepository.list(filters, pagination);
}

export async function createManagedUser(
  adminId: string,
  input: { email: string; fullName: string; password: string; role: UserRole },
) {
  await requireActiveAdmin(adminId);
  try {
    const created = await userRepository.insert({
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      passwordHash: await hashPasswordWithM1(input.password),
      role: input.role,
      status: "active",
    });
    const user = await userRepository.findPublicById(created.id);
    if (!user) throw new Error("Newly created user could not be loaded");
    return user;
  } catch (error) {
    normalizeConflict(error);
  }
}

export async function bootstrapFirstAdmin(input: { email: string; fullName: string; password: string }) {
  let passwordHash: string;
  try {
    passwordHash = await hashPasswordWithM1(input.password);
  } catch {
    throw new HttpError(500, "ADMIN_BOOTSTRAP_FAILED", "Admin password hashing failed; no database write was made");
  }

  let result: Awaited<ReturnType<typeof userRepository.insertFirstAdmin>>;
  try {
    result = await userRepository.insertFirstAdmin({
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      passwordHash,
      role: UserRole.Admin,
      status: "active",
    });
  } catch {
    // Drizzle query errors may include bound SQL parameters; never expose them to the CLI.
    throw new HttpError(500, "ADMIN_BOOTSTRAP_FAILED", "Admin bootstrap failed; the transaction was rolled back");
  }
  if (result.kind === "already_exists") {
    throw new HttpError(409, "ADMIN_ALREADY_EXISTS", "An Admin account already exists; bootstrap is one-time only");
  }
  return result.user;
}

export async function updateUserProfile(adminId: string, userId: string, patch: userRepository.ProfilePatch) {
  await requireActiveAdmin(adminId);
  return updateOwnProfile(userId, patch);
}

export async function changeUserRole(adminId: string, userId: string, role: UserRole) {
  await requireActiveAdmin(adminId);
  const result = await userRepository.updateRole(userId, role, adminId);
  if (result.kind === "not_found") throw new HttpError(404, "NOT_FOUND", "User not found");
  if (result.kind === "last_admin") throw new HttpError(409, "LAST_ADMIN", "The last active administrator cannot be demoted");
  return result.user;
}

export async function changeUserStatus(adminId: string, userId: string, status: "active" | "locked") {
  await requireActiveAdmin(adminId);
  const result = await userRepository.updateStatus(userId, status);
  if (result.kind === "not_found") throw new HttpError(404, "NOT_FOUND", "User not found");
  if (result.kind === "last_admin") throw new HttpError(409, "LAST_ADMIN", "The last active administrator cannot be locked");
  return result.user;
}

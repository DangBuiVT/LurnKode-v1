import { and, count, eq, ilike, or, sql } from "drizzle-orm";
import { db, refreshSessions, users, type NewUser, type User } from "../db";
import type { PaginationParams } from "../utils/pagination";
import { toOffset } from "../utils/pagination";
import type { PublicUser, UserRole } from "../types";

const publicColumns = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  avatarUrl: users.avatarUrl,
  role: users.role,
  createdAt: users.createdAt,
} as const;

function asPublicUser(row: Omit<PublicUser, "role"> & { role: string }): PublicUser {
  return { ...row, role: row.role as UserRole };
}

export interface UserListFilters {
  search?: string;
  role?: UserRole;
  status?: "active" | "locked";
}

export async function findByLoginIdentifier(identifier: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.email, identifier.trim().toLowerCase()) });
}

export async function findById(userId: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, userId) });
}

export async function findPublicById(userId: string): Promise<PublicUser | undefined> {
  const row = await db.query.users.findFirst({
    columns: { passwordHash: false, status: false, updatedAt: false },
    where: eq(users.id, userId),
  });
  return row ? asPublicUser(row) : undefined;
}

export async function list(filters: UserListFilters, pagination: PaginationParams): Promise<{ users: PublicUser[]; totalItems: number }> {
  const conditions = [];
  if (filters.role) conditions.push(eq(users.role, filters.role));
  if (filters.status) conditions.push(eq(users.status, filters.status));
  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    conditions.push(or(ilike(users.email, search), ilike(users.fullName, search))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [total]] = await Promise.all([
    db.select(publicColumns).from(users).where(where).limit(pagination.limit).offset(toOffset(pagination.page, pagination.limit)),
    db.select({ value: count() }).from(users).where(where),
  ]);
  return { users: rows.map(asPublicUser), totalItems: total?.value ?? 0 };
}

export async function insert(userRecord: NewUser): Promise<User> {
  const [created] = await db.insert(users).values(userRecord).returning();
  if (!created) throw new Error("User insert did not return a row");
  return created;
}

export type ProfilePatch = Partial<Pick<User, "email" | "fullName" | "avatarUrl">>;

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<PublicUser | undefined> {
  const safePatch: ProfilePatch = {};
  if (patch.email !== undefined) safePatch.email = patch.email.trim().toLowerCase();
  if (patch.fullName !== undefined) safePatch.fullName = patch.fullName;
  if (patch.avatarUrl !== undefined) safePatch.avatarUrl = patch.avatarUrl;
  if (Object.keys(safePatch).length === 0) return findPublicById(userId);
  const [updated] = await db.update(users).set({ ...safePatch, updatedAt: new Date() })
    .where(eq(users.id, userId)).returning(publicColumns);
  return updated ? asPublicUser(updated) : undefined;
}

/** Role changes are recorded only in the users row until an audit table is added to the schema. */
export async function updateRole(userId: string, role: UserRole, actorId: string): Promise<
  { kind: "updated"; user: PublicUser } | { kind: "not_found" } | { kind: "last_admin" }
> {
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(641907321)`);
    const [current] = await transaction.select({ role: users.role, status: users.status })
      .from(users).where(eq(users.id, userId)).limit(1);
    if (!current) return { kind: "not_found" };
    if (current.role === "Admin" && current.status === "active" && role !== "Admin") {
      const [activeAdminCount] = await transaction.select({ value: count() }).from(users)
        .where(and(eq(users.role, "Admin"), eq(users.status, "active")));
      if ((activeAdminCount?.value ?? 0) <= 1) return { kind: "last_admin" };
    }
    void actorId;
    const [updated] = await transaction.update(users).set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId)).returning(publicColumns);
    return updated ? { kind: "updated", user: asPublicUser(updated) } : { kind: "not_found" };
  });
}

export async function updateStatus(userId: string, status: "active" | "locked"): Promise<
  { kind: "updated"; user: PublicUser } | { kind: "not_found" } | { kind: "last_admin" }
> {
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(641907321)`);
    const [current] = await transaction.select({ role: users.role, status: users.status })
      .from(users).where(eq(users.id, userId)).limit(1);
    if (!current) return { kind: "not_found" };
    if (current.role === "Admin" && current.status === "active" && status === "locked") {
      const [activeAdminCount] = await transaction.select({ value: count() }).from(users)
        .where(and(eq(users.role, "Admin"), eq(users.status, "active")));
      if ((activeAdminCount?.value ?? 0) <= 1) return { kind: "last_admin" };
    }
    const [updated] = await transaction.update(users).set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId)).returning(publicColumns);
    if (!updated) return { kind: "not_found" };
    if (status === "locked") {
      await transaction.update(refreshSessions).set({ revokedAt: new Date() })
        .where(and(eq(refreshSessions.userId, userId), isNullSessionRevoked()));
    }
    return { kind: "updated", user: asPublicUser(updated) };
  });
}

function isNullSessionRevoked() {
  return sql`${refreshSessions.revokedAt} IS NULL`;
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<boolean> {
  const [updated] = await db.update(users).set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId)).returning({ id: users.id });
  return updated !== undefined;
}

export async function updatePasswordAndRevokeSessions(userId: string, passwordHash: string): Promise<boolean> {
  return db.transaction(async (transaction) => {
    const [updated] = await transaction.update(users).set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId)).returning({ id: users.id });
    if (!updated) return false;
    await transaction.update(refreshSessions).set({ revokedAt: new Date() })
      .where(and(eq(refreshSessions.userId, userId), sql`${refreshSessions.revokedAt} IS NULL`));
    return true;
  });
}

export async function countActiveAdmins(): Promise<number> {
  const [result] = await db.select({ value: count() }).from(users)
    .where(and(eq(users.role, "Admin"), eq(users.status, "active")));
  return result?.value ?? 0;
}

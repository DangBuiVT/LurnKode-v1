import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db, refreshSessions, type NewRefreshSession, type RefreshSession } from "../db";

export async function insertRefreshSession(session: NewRefreshSession): Promise<RefreshSession> {
  const [created] = await db.insert(refreshSessions).values(session).returning();
  if (!created) throw new Error("Refresh session insert did not return a row");
  return created;
}

export async function findByTokenHash(hash: string): Promise<RefreshSession | undefined> {
  return db.query.refreshSessions.findFirst({ where: eq(refreshSessions.tokenHash, hash) });
}

/** Atomically consumes an unexpired session and inserts its replacement in one transaction. */
export async function consumeAndRotate(sessionId: string, replacement: NewRefreshSession): Promise<boolean> {
  return db.transaction(async (transaction) => {
    const [consumed] = await transaction.update(refreshSessions)
      .set({ consumedAt: new Date() })
      .where(and(
        eq(refreshSessions.id, sessionId),
        isNull(refreshSessions.consumedAt),
        isNull(refreshSessions.revokedAt),
        gtNow(),
      ))
      .returning({ id: refreshSessions.id });
    if (!consumed) return false;
    await transaction.insert(refreshSessions).values(replacement);
    return true;
  });
}

function gtNow() {
  return sql`${refreshSessions.expiresAt} > now()`;
}

export async function revokeSession(sessionId: string, _reason?: string): Promise<boolean> {
  const [revoked] = await db.update(refreshSessions).set({ revokedAt: new Date() })
    .where(and(eq(refreshSessions.id, sessionId), isNull(refreshSessions.revokedAt)))
    .returning({ id: refreshSessions.id });
  return revoked !== undefined;
}

export async function revokeFamily(familyId: string, _reason?: string): Promise<number> {
  const rows = await db.update(refreshSessions).set({ revokedAt: new Date() })
    .where(and(eq(refreshSessions.familyId, familyId), isNull(refreshSessions.revokedAt)))
    .returning({ id: refreshSessions.id });
  return rows.length;
}

export async function revokeAllForUser(userId: string, _reason?: string): Promise<number> {
  const rows = await db.update(refreshSessions).set({ revokedAt: new Date() })
    .where(and(eq(refreshSessions.userId, userId), isNull(refreshSessions.revokedAt)))
    .returning({ id: refreshSessions.id });
  return rows.length;
}

export async function cleanupExpiredSessions(now = new Date()): Promise<number> {
  const rows = await db.delete(refreshSessions)
    .where(lt(refreshSessions.expiresAt, now))
    .returning({ id: refreshSessions.id });
  return rows.length;
}

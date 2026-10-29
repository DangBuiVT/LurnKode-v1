import { Elysia } from "elysia";
import { closeDatabaseConnection, db, pool } from "../db";

/** Adds the shared Drizzle client and pg pool to Elysia's request context. */
export const databasePlugin = new Elysia({ name: "database" })
  .decorate("db", db)
  .decorate("dbPool", pool);

export { closeDatabaseConnection };

export async function exposeDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

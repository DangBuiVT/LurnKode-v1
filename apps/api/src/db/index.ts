import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

export { schema };
export * from "./schema";

export function createDatabaseClient(databaseUrl: string, poolConfig: Omit<PoolConfig, "connectionString"> = {}) {
  const clientPool = new Pool({ ...poolConfig, connectionString: databaseUrl });
  const client = drizzle(clientPool, { schema });
  return { db: client, pool: clientPool };
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be configured before importing the database client");

const database = createDatabaseClient(databaseUrl);
export const db: NodePgDatabase<typeof schema> = database.db;
export const pool = database.pool;

export function getPool(): Pool {
  return pool;
}

export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
}

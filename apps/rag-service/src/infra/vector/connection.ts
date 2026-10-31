import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { PgVectorStore, type EmbeddingProfile } from "./pgvectorStore.ts";
import * as schema from "./schema.ts";
import { embeddingConfig } from "../../config.ts";

export function connectPgvectorStore(
  databaseUrl: string,
  profile: EmbeddingProfile = embeddingConfig,
) {
  if (!databaseUrl.trim()) throw new Error("Database URL is required");
  const client = postgres(databaseUrl, {
    max: 5,
    prepare: false,
    connect_timeout: 10,
  });
  const database = drizzle(client, { schema });
  return {
    store: new PgVectorStore(database, profile),
    database,
    close: () => client.end({ timeout: 5 }),
  };
}

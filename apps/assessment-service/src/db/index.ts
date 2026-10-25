/**
 * @file db/index.ts
 * @description Database connection pool and Drizzle ORM client initialization.
 */

import * as schema from "./schema";

export interface DatabaseClient {
  schema: typeof schema;
  query: Record<string, unknown>;
}

// Lazy/Mockable DB client setup for development & testing
export const db = {
  schema,
  query: {},
};

export * from "./schema";


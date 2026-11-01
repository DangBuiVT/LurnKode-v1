import { bigserial, boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * M6-owned tables (typed definition). No foreign keys into M3-owned tables:
 * attempt/assessment ids are opaque external references.
 * DDL is applied by ./migrate.ts (idempotent bootstrap for the demo).
 */
export const judgeSubmissions = pgTable("judge_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  callerId: text("caller_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  clientSubmissionId: uuid("client_submission_id").notNull().unique(),
  attemptId: uuid("attempt_id").notNull(),
  assessmentItemId: uuid("assessment_item_id").notNull(),
  revision: integer("revision").notNull(),
  language: text("language").notNull(),
  status: text("status").notNull().default("queued"),
  limits: jsonb("limits").notNull(),
  traceId: text("trace_id").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const judgePayloadSnapshots = pgTable("judge_payload_snapshots", {
  submissionId: uuid("submission_id").primaryKey(),
  sourceCode: text("source_code").notNull(),
  judgePackage: jsonb("judge_package").notNull(),
  sourceHash: text("source_hash").notNull(),
});

export const judgeResults = pgTable("judge_results", {
  submissionId: uuid("submission_id").primaryKey(),
  executionStatus: text("execution_status").notNull(),
  verdict: text("verdict"),
  summary: jsonb("summary"),
  metrics: jsonb("metrics"),
  diagnostics: jsonb("diagnostics"),
  failureCode: text("failure_code"),
  failureRetryable: boolean("failure_retryable"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const judgeOutbox = pgTable("judge_outbox", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  submissionId: uuid("submission_id").notNull(),
  kind: text("kind").notNull(), // enqueue | callback
  state: text("state").notNull().default("pending"), // pending | delivered | dead
  payload: jsonb("payload").notNull(),
  eventId: uuid("event_id"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const judgeEvents = pgTable("judge_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  submissionId: uuid("submission_id").notNull(),
  type: text("type").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

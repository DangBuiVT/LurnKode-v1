/**
 * @file schema.ts
 * @description Dedicated PostgreSQL schema for Assessment Service (Database-per-Service).
 *
 * Microservice Note:
 * - course_id and user_id are logical references (UUID varchar/text), NOT foreign keys
 *   referencing external service databases (M1/M2).
 */

import {
  pgTable,
  text,
  varchar,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  jsonb,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 1. Assessments
export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: varchar("course_id", { length: 255 }).notNull(), // Logical reference to M2 Course
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 32 }).notNull().default("draft"), // draft | published | archived
    maxAttempts: integer("max_attempts").notNull().default(3),
    timeLimitSec: integer("time_limit_sec"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("assessments_course_id_idx").on(table.courseId),
    index("assessments_status_idx").on(table.status),
  ]
);

// 2. Assessment Items (Questions)
export const assessmentItems = pgTable(
  "assessment_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(), // mcq | programming
    title: varchar("title", { length: 255 }).notNull(),
    prompt: text("prompt").notNull(),
    points: doublePrecision("points").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    difficulty: varchar("difficulty", { length: 32 }), // easy | medium | hard
    tags: jsonb("tags").$type<string[]>(),
    mcqPayload: jsonb("mcq_payload"),
    programmingPayload: jsonb("programming_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("items_assessment_id_idx").on(table.assessmentId),
    index("items_type_idx").on(table.type),
  ]
);

// 3. Attempts
export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(), // Logical reference to M1 User
    status: varchar("status", { length: 32 }).notNull().default("in_progress"), // in_progress | submitted | grading | completed | failed
    score: doublePrecision("score").notNull().default(0),
    maxScore: doublePrecision("max_score").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("attempts_user_id_idx").on(table.userId),
    index("attempts_assessment_id_idx").on(table.assessmentId),
    index("attempts_status_idx").on(table.status),
  ]
);

// 4. Answers (MCQ)
export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => assessmentItems.id, { onDelete: "cascade" }),
    selectedOptionIds: jsonb("selected_option_ids").$type<string[]>().notNull(),
    score: doublePrecision("score").notNull().default(0),
    maxScore: doublePrecision("max_score").notNull().default(0),
    status: varchar("status", { length: 32 }).notNull().default("incorrect"), // correct | incorrect
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_attempt_item_answer_idx").on(table.attemptId, table.itemId),
    index("answers_attempt_id_idx").on(table.attemptId),
  ]
);

// 5. Code Submissions (Programming)
export const codeSubmissions = pgTable(
  "code_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => assessmentItems.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 64 }).notNull(),
    sourceCode: text("source_code").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("queued"), // queued | running | judged | failed
    judgeJobId: varchar("judge_job_id", { length: 255 }),
    finalStatus: varchar("final_status", { length: 32 }), // AC | WA | TLE | MLE | RE | CE
    score: doublePrecision("score").notNull().default(0),
    maxScore: doublePrecision("max_score").notNull().default(0),
    executionMs: integer("execution_ms"),
    memoryKb: integer("memory_kb"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("submissions_attempt_id_idx").on(table.attemptId),
    index("submissions_item_id_idx").on(table.itemId),
    index("submissions_status_idx").on(table.status),
  ]
);

// 6. Test Results
export const testResults = pgTable(
  "test_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeSubmissionId: uuid("code_submission_id")
      .notNull()
      .references(() => codeSubmissions.id, { onDelete: "cascade" }),
    testCaseId: varchar("test_case_id", { length: 255 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(), // AC | WA | TLE | MLE | RE | CE
    executionMs: integer("execution_ms").notNull().default(0),
    message: text("message"),
    hidden: boolean("hidden").notNull().default(true),
  },
  (table) => [
    index("test_results_submission_id_idx").on(table.codeSubmissionId),
  ]
);


import { bigint, check, index, integer, jsonb, pgSchema, text, unique, uuid, vector } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { SourceLocation } from "../../domain/document.ts";

export const VECTOR_DIMENSION = 768;
const m4 = pgSchema("m4_rag");

export const ragSources = m4.table("rag_sources", {
  materialId: uuid("material_id").primaryKey(),
  courseId: uuid("course_id"),
  activeVersion: text("active_version"),
  generation: bigint("generation", { mode: "number" }).notNull(),
  status: text("status").notNull(),
  embeddingModel: text("embedding_model"),
  embeddingDimension: integer("embedding_dimension"),
  embeddingFormat: text("embedding_format"),
}, table => [
  check("source_generation_positive", sql`${table.generation} > 0`),
  check("source_status_valid", sql`${table.status} in ('indexed', 'inactive')`),
  check("source_state_valid", sql`(${table.status} = 'inactive' and ${table.activeVersion} is null) or
    (${table.status} = 'indexed' and ${table.activeVersion} is not null and ${table.courseId} is not null
    and ${table.embeddingModel} is not null and ${table.embeddingDimension} = ${sql.raw(String(VECTOR_DIMENSION))} and ${table.embeddingFormat} is not null)`),
  index("source_course_status").on(table.courseId, table.status),
]).enableRLS();

export const ragChunks = m4.table("rag_chunks", {
  id: text("id").primaryKey(),
  materialId: uuid("material_id").notNull().references(() => ragSources.materialId, { onDelete: "restrict" }),
  courseId: uuid("course_id").notNull(),
  chapterId: uuid("chapter_id").notNull(),
  lessonId: uuid("lesson_id").notNull(),
  versionKey: text("version_key").notNull(),
  text: text("content").notNull(),
  ordinal: integer("ordinal").notNull(),
  headingPath: text("heading_path").notNull(),
  startOffset: bigint("start_offset", { mode: "number" }).notNull(),
  endOffset: bigint("end_offset", { mode: "number" }).notNull(),
  location: jsonb("location").$type<SourceLocation>(),
  fileName: text("file_name"),
  materialTitle: text("material_title").notNull(),
  embedding: vector("embedding", { dimensions: VECTOR_DIMENSION }).notNull(),
  embeddingModel: text("embedding_model").notNull(),
  embeddingFormat: text("embedding_format").notNull(),
}, table => [
  unique("chunk_version_ordinal").on(table.materialId, table.versionKey, table.ordinal),
  check("chunk_ordinal_nonnegative", sql`${table.ordinal} >= 0`),
  check("chunk_offsets_valid", sql`${table.startOffset} >= 0 and ${table.endOffset} > ${table.startOffset}`),
  check("chunk_text_nonempty", sql`length(btrim(${table.text})) > 0`),
  check("chunk_vector_nonzero", sql`vector_norm(${table.embedding}) > 0`),
  index("chunk_course_source_version").on(table.courseId, table.materialId, table.versionKey),
]).enableRLS();

import { and, asc, desc, cosineDistance, eq, getTableColumns, gte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { VectorStore, SourceState } from "../../services/ports/vectorStore.ts";
import type { IndexedChunk } from "../../domain/chunk.ts";
import type { RetrievalQuery, SearchHit } from "../../domain/retrieval.ts";
import { InvalidInput, SourceVersionConflict } from "../../domain/errors.ts";
import { embeddingConfig } from "../../config.ts";
import * as tables from "./schema.ts";
import {
  validateAndSnapshotChunks,
  validateExternalId,
  validateSearchQuery,
  validateSourceGeneration,
  validateText,
} from "./validation.ts";

export interface EmbeddingProfile {
  model: string;
  dimension: number;
  taskFormatVersion: string;
}

export type VectorDatabase = PostgresJsDatabase<typeof tables>;
type ChunkRow = typeof tables.ragChunks.$inferSelect;
type ChunkInsert = typeof tables.ragChunks.$inferInsert;

const CHUNK_INSERT_BATCH_SIZE = 100;

function toIndexedChunk(row: ChunkRow): IndexedChunk {
  return {
    id: row.id,
    materialId: row.materialId,
    courseId: row.courseId,
    chapterId: row.chapterId,
    lessonId: row.lessonId,
    versionKey: row.versionKey,
    text: row.text,
    ordinal: row.ordinal,
    headingPath: row.headingPath,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    fileName: row.fileName,
    materialTitle: row.materialTitle,
    embedding: row.embedding,
    ...(row.location === null ? {} : { location: row.location }),
  };
}

function toChunkInsert(chunk: IndexedChunk, profile: Readonly<EmbeddingProfile>): ChunkInsert {
  return {
    ...chunk,
    location: chunk.location ?? null,
    embeddingModel: profile.model,
    embeddingFormat: profile.taskFormatVersion,
  };
}

function canonicalChunk(chunk: IndexedChunk) {
  return [
    chunk.id,
    chunk.materialId,
    chunk.courseId,
    chunk.chapterId,
    chunk.lessonId,
    chunk.versionKey,
    chunk.text,
    chunk.ordinal,
    chunk.headingPath,
    chunk.startOffset,
    chunk.endOffset,
    chunk.fileName,
    chunk.materialTitle,
    chunk.embedding.map(Math.fround),
    chunk.location ? Object.entries(chunk.location).sort(([a], [b]) => a.localeCompare(b)) : null,
  ];
}

function validateStoredChunks(
  existing: readonly ChunkRow[],
  incoming: readonly IndexedChunk[],
  profile: Readonly<EmbeddingProfile>,
): void {
  if (existing.length === 0) return;

  const matches = existing.length === incoming.length && existing.every((row, index) =>
    row.embeddingModel === profile.model &&
    row.embeddingFormat === profile.taskFormatVersion &&
    JSON.stringify(canonicalChunk(toIndexedChunk(row))) === JSON.stringify(canonicalChunk(incoming[index])),
  );
  if (!matches) {
    throw new InvalidInput("Cannot replace immutable chunks or reuse a version with a different embedding profile");
  }
}

export class PgVectorStore implements VectorStore {
  private readonly profile: Readonly<EmbeddingProfile>;

  constructor(
    private readonly db: VectorDatabase,
    profile: EmbeddingProfile = embeddingConfig,
  ) {
    if (profile.dimension !== tables.VECTOR_DIMENSION) {
      throw new InvalidInput("Profile does not match vector schema dimension");
    }
    this.profile = Object.freeze({
      model: validateText(profile.model, "embedding model"),
      dimension: profile.dimension,
      taskFormatVersion: validateText(profile.taskFormatVersion, "embedding format"),
    });
  }

  async getSourceState(materialId: string): Promise<SourceState> {
    const [source] = await this.db
      .select()
      .from(tables.ragSources)
      .where(eq(tables.ragSources.materialId, validateExternalId(materialId)));

    if (!source) return { activeVersion: null, generation: 0 };
    return {
      activeVersion: source.status === "indexed" ? source.activeVersion : null,
      generation: source.generation,
    };
  }

  async getActiveVersion(materialId: string): Promise<string | null> {
    return (await this.getSourceState(materialId)).activeVersion;
  }

  async activateVersion(
    materialId: string,
    versionKey: string,
    chunks: readonly IndexedChunk[],
    expectedGeneration: number,
  ): Promise<void> {
    const id = validateExternalId(materialId);
    const version = validateText(versionKey, "version key");
    validateSourceGeneration(expectedGeneration);
    const snapshot = validateAndSnapshotChunks(id, version, chunks, this.profile.dimension);
    const courseId = snapshot[0].courseId;
    const sources = tables.ragSources;
    const storedChunks = tables.ragChunks;

    await this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${id}, 0))`);
      const [source] = await tx.select().from(sources).where(eq(sources.materialId, id));
      if ((source?.generation ?? 0) !== expectedGeneration) throw new SourceVersionConflict();
      if (source?.courseId && source.courseId !== courseId) {
        throw new InvalidInput("Material cannot change course");
      }

      const existing = await tx
        .select()
        .from(storedChunks)
        .where(and(eq(storedChunks.materialId, id), eq(storedChunks.versionKey, version)))
        .orderBy(asc(storedChunks.ordinal));
      validateStoredChunks(existing, snapshot, this.profile);

      if (source?.activeVersion === version && source.status === "indexed" && existing.length > 0) return;

      if (!source) {
        await tx.insert(sources).values({ materialId: id, generation: 1, status: "inactive" });
      }
      if (existing.length === 0) {
        for (let offset = 0; offset < snapshot.length; offset += CHUNK_INSERT_BATCH_SIZE) {
          const batch = snapshot
            .slice(offset, offset + CHUNK_INSERT_BATCH_SIZE)
            .map(chunk => toChunkInsert(chunk, this.profile));
          await tx.insert(storedChunks).values(batch);
        }
      }

      await tx
        .update(sources)
        .set({
          courseId,
          activeVersion: version,
          generation: expectedGeneration + 1,
          status: "indexed",
          embeddingModel: this.profile.model,
          embeddingDimension: this.profile.dimension,
          embeddingFormat: this.profile.taskFormatVersion,
        })
        .where(eq(sources.materialId, id));
    });
  }

  async deactivateMaterial(materialId: string, expectedGeneration?: number): Promise<void> {
    const id = validateExternalId(materialId);
    const sources = tables.ragSources;
    if (expectedGeneration !== undefined) validateSourceGeneration(expectedGeneration);

    await this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${id}, 0))`);
      if (expectedGeneration !== undefined) {
        const [source] = await tx.select().from(sources).where(eq(sources.materialId, id));
        if ((source?.generation ?? 0) !== expectedGeneration) throw new SourceVersionConflict();
      }
      await tx
        .insert(sources)
        .values({ materialId: id, generation: 1, status: "inactive" })
        .onConflictDoUpdate({
          target: sources.materialId,
          set: {
            activeVersion: null,
            status: "inactive",
            generation: sql`${sources.generation} + 1`,
          },
        });
    });
  }

  async getChunkById(chunkId: string): Promise<IndexedChunk | null> {
    const [row] = await this.db
      .select()
      .from(tables.ragChunks)
      .where(eq(tables.ragChunks.id, validateText(chunkId, "chunk ID")));
    return row ? toIndexedChunk(row) : null;
  }

  async search(query: RetrievalQuery): Promise<SearchHit[]> {
    const { courseId, vector, topK, minScore } = validateSearchQuery(query, this.profile.dimension);
    const chunks = tables.ragChunks;
    const sources = tables.ragSources;
    const distance = cosineDistance(chunks.embedding, vector);
    const score = sql<number>`1 - (${distance})`.mapWith(Number);

    const rows = await this.db.transaction(async tx => {
      await tx.execute(sql`set local hnsw.iterative_scan = 'strict_order'`);
      const nearest = tx.$with("nearest").as(
        tx.select({ ...getTableColumns(chunks), score: score.as("score") })
          .from(chunks)
          .innerJoin(sources, eq(sources.materialId, chunks.materialId))
          .where(and(
            eq(chunks.courseId, courseId),
            eq(sources.courseId, courseId),
            eq(sources.status, "indexed"),
            eq(chunks.versionKey, sources.activeVersion),
            eq(sources.embeddingModel, this.profile.model),
            eq(sources.embeddingDimension, this.profile.dimension),
            eq(sources.embeddingFormat, this.profile.taskFormatVersion),
            eq(chunks.embeddingModel, this.profile.model),
            eq(chunks.embeddingFormat, this.profile.taskFormatVersion),
          ))
          .orderBy(asc(distance))
          .limit(topK),
      );
      return tx.with(nearest).select().from(nearest)
        .where(gte(nearest.score, minScore))
        .orderBy(desc(nearest.score), asc(nearest.id));
    });
    return rows.map(row => ({ ...toIndexedChunk(row), score: row.score }));
  }
}

import type { IndexedChunk } from "../domain/chunk.ts";
import type { SourceLocation } from "../domain/document.ts";
import type { RetrievalQuery } from "../domain/retrieval.ts";
import { InvalidInput } from "../domain/errors.ts";

export function validateSourceGeneration(generation: number): void {
  if (!Number.isSafeInteger(generation) || generation < 0 || generation >= Number.MAX_SAFE_INTEGER) {
    throw new InvalidInput("Invalid source generation");
  }
}

export function validateSearchQuery(
  query: RetrievalQuery,
  dimension: number,
): RetrievalQuery & { vector: number[] } {
  const courseId = validateExternalId(query.courseId);
  const vector = validateAndNormalizeVector(query.vector, dimension);
  if (!Number.isSafeInteger(query.topK) || query.topK < 1 || query.topK > 100) {
    throw new InvalidInput("topK must be between 1 and 100");
  }
  if (!Number.isFinite(query.minScore) || query.minScore < -1 || query.minScore > 1) {
    throw new InvalidInput("minScore must be between -1 and 1");
  }
  return { courseId, vector, topK: query.topK, minScore: query.minScore };
}

export function validateExternalId(value: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new InvalidInput("External IDs must be UUIDs in the local draft schema");
  }
  return value.toLowerCase();
}

export function validateText(value: string, label: string, allowEmpty = false): string {
  if (typeof value !== "string" || value.includes("\0") || (!allowEmpty && !value.trim())) {
    throw new InvalidInput(`${label} must be valid nonempty text`);
  }
  return value;
}

export function validateAndNormalizeVector(value: readonly number[], dimension: number): number[] {
  if (!Array.isArray(value) || value.length !== dimension) throw new InvalidInput("Vector dimension mismatch");
  const result: number[] = [];
  for (const component of value) {
    if (typeof component !== "number" || !Number.isFinite(component)) {
      throw new InvalidInput("Vector components must be finite float32 numbers");
    }
    const single = Math.fround(component);
    if (!Number.isFinite(single)) throw new InvalidInput("Vector components must be finite float32 numbers");
    result.push(single);
  }
  if (!result.some(component => component !== 0)) throw new InvalidInput("Cosine search requires a nonzero vector");
  return result;
}

function validateSourceLocation(value: SourceLocation | undefined): SourceLocation | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") throw new InvalidInput("Invalid source location");
  const keys = Object.keys(value);
  if (keys.length === 1 && "page" in value && Number.isSafeInteger(value.page) && value.page >= 1) return { page: value.page };
  if (keys.length === 1 && "slide" in value && Number.isSafeInteger(value.slide) && value.slide >= 1) return { slide: value.slide };
  if (keys.length === 2 && "startSeconds" in value && "endSeconds" in value &&
      Number.isFinite(value.startSeconds) && Number.isFinite(value.endSeconds) &&
      value.startSeconds >= 0 && value.endSeconds > value.startSeconds) {
    return { startSeconds: value.startSeconds, endSeconds: value.endSeconds };
  }
  throw new InvalidInput("Invalid source location");
}

function validateChunkOffsets(startOffset: number, endOffset: number, textLength: number): void {
  if (
    !Number.isSafeInteger(startOffset) ||
    !Number.isSafeInteger(endOffset) ||
    startOffset < 0 ||
    endOffset <= startOffset ||
    endOffset - startOffset !== textLength
  ) {
    throw new InvalidInput("Invalid UTF-16 chunk offsets");
  }
}

function validateAndSnapshotChunk(
  chunk: IndexedChunk,
  materialId: string,
  versionKey: string,
  dimension: number,
): IndexedChunk {
  if (!chunk || typeof chunk !== "object") throw new InvalidInput("Invalid chunk");

  const id = validateText(chunk.id, "chunk ID");
  if (validateExternalId(chunk.materialId) !== materialId || chunk.versionKey !== versionKey) {
    throw new InvalidInput("Chunk source/version mismatch");
  }

  const text = validateText(chunk.text, "chunk text");
  if (!Number.isSafeInteger(chunk.ordinal) || chunk.ordinal < 0) {
    throw new InvalidInput("Invalid ordinal");
  }
  validateChunkOffsets(chunk.startOffset, chunk.endOffset, text.length);

  const location = validateSourceLocation(chunk.location);
  return {
    id,
    materialId,
    versionKey,
    courseId: validateExternalId(chunk.courseId),
    chapterId: validateExternalId(chunk.chapterId),
    lessonId: validateExternalId(chunk.lessonId),
    text,
    ordinal: chunk.ordinal,
    headingPath: validateText(chunk.headingPath, "heading path", true),
    startOffset: chunk.startOffset,
    endOffset: chunk.endOffset,
    fileName: chunk.fileName === null ? null : validateText(chunk.fileName, "file name"),
    materialTitle: validateText(chunk.materialTitle, "material title"),
    embedding: validateAndNormalizeVector(chunk.embedding, dimension),
    ...(location === undefined ? {} : { location }),
  };
}

export function validateAndSnapshotChunks(
  materialId: string,
  versionKey: string,
  chunks: readonly IndexedChunk[],
  dimension: number,
): IndexedChunk[] {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new InvalidInput("Activation requires nonempty chunks");
  }

  const ids = new Set<string>();
  const snapshots = chunks.map(chunk => {
    const snapshot = validateAndSnapshotChunk(chunk, materialId, versionKey, dimension);
    if (ids.has(snapshot.id)) throw new InvalidInput("Duplicate chunk ID");
    ids.add(snapshot.id);
    return snapshot;
  });
  snapshots.sort((left, right) => left.ordinal - right.ordinal);

  const firstChunk = snapshots[0];
  for (const [index, chunk] of snapshots.entries()) {
    if (
      chunk.ordinal !== index ||
      chunk.courseId !== firstChunk.courseId ||
      chunk.chapterId !== firstChunk.chapterId ||
      chunk.lessonId !== firstChunk.lessonId
    ) {
      throw new InvalidInput("Chunks must share source hierarchy and contiguous ordinals");
    }
  }

  return snapshots;
}

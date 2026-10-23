import type { IndexedChunk } from "../../domain/chunk.ts";
import type { SearchHit, RetrievalQuery } from "../../domain/retrieval.ts";

export interface VectorStore {
  getActiveVersion(materialId: string): Promise<string | null>;
  activateVersion(materialId: string, versionKey: string, chunks: readonly IndexedChunk[]): Promise<void>;
  deactivateMaterial(materialId: string): Promise<void>;
  /** Đọc được chunk lịch sử đã cited; không áp dụng active-only như search. */
  getChunkById(chunkId: string): Promise<IndexedChunk | null>;
  search(query: RetrievalQuery): Promise<SearchHit[]>;
}

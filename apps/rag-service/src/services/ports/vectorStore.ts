import type { IndexedChunk } from "../../domain/chunk.ts";
import type { SearchHit, RetrievalQuery } from "../../domain/retrieval.ts";

export interface SourceState {
  activeVersion: string | null;
  generation: number;
}

export interface VectorStore {
  getSourceState(materialId: string): Promise<SourceState>;
  getActiveVersion(materialId: string): Promise<string | null>;
  activateVersion(materialId: string, versionKey: string, chunks: readonly IndexedChunk[], expectedGeneration: number): Promise<void>;
  deactivateMaterial(materialId: string): Promise<void>;
  getChunkById(chunkId: string): Promise<IndexedChunk | null>;
  search(query: RetrievalQuery): Promise<SearchHit[]>;
}

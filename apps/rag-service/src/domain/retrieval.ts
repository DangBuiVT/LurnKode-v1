import type { IndexedChunk } from "./chunk.ts";

export interface SearchHit extends IndexedChunk { score: number }
export interface RetrievalQuery {
  courseId: string;
  vector: readonly number[];
  topK: number;
  minScore: number;
}

export interface RetrievalInput {
  learnerId: string;
  courseId: string;
  question: string;
}

export type RetrievedChunk = Omit<SearchHit, "embedding">;
export interface RetrievalResult {
  courseId: string;
  question: string;
  hits: RetrievedChunk[];
}

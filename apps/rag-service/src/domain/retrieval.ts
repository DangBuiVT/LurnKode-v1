import type { IndexedChunk } from "./chunk.ts";

export interface SearchHit extends IndexedChunk { score: number }
/** courseId phải lấy từ conversation đã xác thực quyền truy cập. */
export interface RetrievalQuery {
  courseId: string;
  vector: readonly number[];
  topK: number;
  minScore: number;
}

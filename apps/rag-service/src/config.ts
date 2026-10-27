import { NotImplemented } from "./domain/errors.ts";

export const processingConfig = {
  maxBytes: 10 * 1024 * 1024,
  chunk: {
    limitWords: 300,
    overlapWords: 50,
  },
};

export type ProcessingConfig = typeof processingConfig;

/** Lựa chọn local đã thống nhất; DB migration và retrieval evaluation vẫn chưa có. */
export const embeddingConfig = {
  model: "gemini-embedding-2",
  dimension: 768,
  timeoutMs: 30_000,
  taskFormatVersion: "gemini2-retrieval-v1",
} as const;

export interface RagConfig {
  topK: number;
  minScore: number;
  processing: ProcessingConfig;
  embeddingDim: number;
  embeddingModel: string;
}

export function ragConfigFromEnv(): RagConfig {
  // TODO: Đọc biến môi trường và kiểm tra topK, threshold, chunk/overlap, model/dimension.
  // TODO: Nối embeddingConfig (Gemini 2, 768 chiều) khi triển khai runtime config.
  throw new NotImplemented("ragConfigFromEnv");
}

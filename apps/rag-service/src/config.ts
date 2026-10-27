import { NotImplemented } from "./domain/errors.ts";

export const processingConfig = {
  maxBytes: 10 * 1024 * 1024,
  chunk: {
    limitWords: 300,
    overlapWords: 50,
  },
};

export type ProcessingConfig = typeof processingConfig;

export interface RagConfig {
  topK: number;
  minScore: number;
  processing: ProcessingConfig;
  embeddingDim: number;
  embeddingModel: string;
}

export function ragConfigFromEnv(): RagConfig {
  // TODO: Đọc biến môi trường và kiểm tra topK, threshold, chunk/overlap, model/dimension.
  // TODO: Chọn model thật trước khi quyết định dimension; không mặc định 384 là đã chọn.
  throw new NotImplemented("ragConfigFromEnv");
}

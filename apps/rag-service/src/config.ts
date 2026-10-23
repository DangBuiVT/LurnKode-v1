import { NotImplemented } from "./domain/errors.ts";

export interface RagConfig {
  topK: number;
  // 0..1 cosine similarity cutoff; experimental DEV only until calibrated on labeled questions.
  minScore: number;
  chunkWords: number;
  overlapWords: number;
  embeddingDim: number;
  embeddingModel: string;
}

export function ragConfigFromEnv(): RagConfig {
  // TODO: Đọc biến môi trường và kiểm tra topK, threshold, chunk/overlap, model/dimension.
  // TODO: Chọn model thật trước khi quyết định dimension; không mặc định 384 là đã chọn.
  throw new NotImplemented("ragConfigFromEnv");
}

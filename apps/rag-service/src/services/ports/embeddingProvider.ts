export type EmbeddingPurpose = "document" | "query";

export interface EmbeddingProvider {
  embed(texts: readonly string[], purpose?: EmbeddingPurpose): Promise<number[][]>;
}

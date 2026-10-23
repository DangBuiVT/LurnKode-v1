export interface EmbeddingProvider {
  embed(texts: readonly string[]): Promise<number[][]>;
}

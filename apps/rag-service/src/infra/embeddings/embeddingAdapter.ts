import type { EmbeddingProvider } from "../../services/ports/embeddingProvider.ts";
import { NotImplemented } from "../../domain/errors.ts";

export const embeddingAdapter: EmbeddingProvider = {
  async embed(texts) {
    // TODO: Gọi provider/model đã chọn; timeout, batch và kiểm tra vector bằng validateVectors.
    // TODO: Query/document dùng cùng model và dimension; không dùng fake vector để triển khai thật.
    throw new NotImplemented("embeddingAdapter.embed");
  },
};

export function validateVectors(vectors: readonly (readonly number[])[], expectedCount: number, dimension: number): void {
  // TODO: Kiểm tra số vector, số chiều, và từng phần tử là số hữu hạn.
  // TODO: Ném lỗi khi sai; không pad/truncate vector để che lỗi model.
  throw new NotImplemented("validateVectors");
}

import type { VectorStore } from "../../services/ports/vectorStore.ts";
import { NotImplemented } from "../../domain/errors.ts";

/** Chưa có connection/migration. TODO: Chỉ truy cập bảng M4 được cấp quyền. */
export const pgvectorStore: VectorStore = {
  async getActiveVersion(materialId) {
    throw new NotImplemented("pgvectorStore.getActiveVersion");
  },
  async activateVersion(materialId, versionKey, chunks) {
    // TODO: Transaction và khóa revision; giữ chunk lịch sử, rollback khi lỗi.
    throw new NotImplemented("pgvectorStore.activateVersion");
  },
  async deactivateMaterial(materialId) {
    // TODO: Ngừng retrieval, không xóa evidence đã cited.
    throw new NotImplemented("pgvectorStore.deactivateMaterial");
  },
  async getChunkById(chunkId) {
    // TODO: Đọc cả lịch sử; service phải kiểm tra quyền và message citation trước khi trả.
    throw new NotImplemented("pgvectorStore.getChunkById");
  },
  async search(query) {
    // TODO: SQL filter authorized course + active indexed source version; cosine search.
    throw new NotImplemented("pgvectorStore.search");
  },
};

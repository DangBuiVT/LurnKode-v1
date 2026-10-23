import type { DocumentParser } from "../../services/ports/documentParser.ts";
import { ParserNotImplemented } from "../../domain/errors.ts";
export const videoParser: DocumentParser = {
  async parse() {
    // TODO 1: Bổ sung port caption/transcription; ưu tiên caption nếu có.
    // TODO 2: Chuyển audio thành transcript qua adapter, không gọi provider trong domain.
    // TODO 3: Một section/đoạn transcript với location: { startSeconds, endSeconds }.
    // TODO 4: Kiểm tra 0 <= startSeconds <= endSeconds; giới hạn thời lượng/cost/timeout.
    // Chưa tải URL hoặc gọi chương trình xử lý media trong skeleton.
    throw new ParserNotImplemented("video");
  },
};

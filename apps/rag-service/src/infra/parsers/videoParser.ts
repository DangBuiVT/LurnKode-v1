import type { DocumentParser, ParserInput } from "../../services/ports/documentParser.ts";
import type { ParsedDocument } from "../../domain/document.ts";
import { ParserNotImplemented } from "../../domain/errors.ts";
export class VideoParser implements DocumentParser {
  async parse(_input: ParserInput): Promise<ParsedDocument> {
    // TODO 1: Bổ sung port caption/transcription; ưu tiên caption nếu có.
    // TODO 2: Chuyển audio thành transcript qua adapter, không gọi provider trong domain.
    // TODO 3: Một section/đoạn transcript với location: { startSeconds, endSeconds }.
    // TODO 4: Kiểm tra 0 <= startSeconds <= endSeconds; giới hạn thời lượng/cost/timeout.
    // Chưa tải URL hoặc gọi chương trình xử lý media trong skeleton.
    throw new ParserNotImplemented("video");
  }
}

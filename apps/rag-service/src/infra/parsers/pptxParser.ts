import type { DocumentParser, ParserInput } from "../../services/ports/documentParser.ts";
import type { ParsedDocument } from "../../domain/document.ts";
import { ParserNotImplemented } from "../../domain/errors.ts";
export class PptxParser implements DocumentParser {
  async parse(_input: ParserInput): Promise<ParsedDocument> {
    // TODO 1: Đọc PPTX (ZIP/XML) bằng adapter thư viện, không chạy macro.
    // TODO 2: Trả một section/slide; location: { slide: 1 } (bắt đầu từ 1).
    // TODO 3: Quyết định lấy speaker notes; ảnh cần OCR riêng.
    // TODO 4: Giới hạn kích thước giải nén/số slide và kiểm thử file hỏng.
    throw new ParserNotImplemented("pptx");
  }
}

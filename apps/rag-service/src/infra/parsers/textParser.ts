import type { DocumentParser } from "../../services/ports/documentParser.ts";
import { ParserNotImplemented } from "../../domain/errors.ts";

export const textParser: DocumentParser = {
  async parse(text) {
    const format = text.format;
    const bytes = text.bytes;
    // TODO: Chỉ nhận txt/md; giải mã UTF-8 strict, xử lý BOM và CRLF.
    // TODO: Trả ParsedDocument với parserVersion; không chia chunk ở adapter.
    // TODO: Giữ nguyên Markdown heading/fence; không trả thành công nếu decode lỗi.
    throw new ParserNotImplemented(format);
  },
};

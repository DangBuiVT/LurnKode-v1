import type { DocumentParser } from "../../services/ports/documentParser.ts";
import { ParserNotImplemented } from "../../domain/errors.ts";
export const pdfParser: DocumentParser = {
  async parse() {
    // TODO 1: Chọn thư viện đọc bytes PDF; trả một section cho mỗi trang.
    // TODO 2: location: { page: 1 } (bắt đầu từ 1); giữ thứ tự đọc.
    // TODO 3: Trang scan cần OCR riêng; báo rõ nếu chưa hỗ trợ, không trả thành công rỗng.
    // TODO 4: Giới hạn số trang/thời gian xử lý; kiểm thử PDF hỏng và mã hóa.
    // PDF slides dùng parser này; citation dẫn số trang.
    throw new ParserNotImplemented("pdf");
  },
};

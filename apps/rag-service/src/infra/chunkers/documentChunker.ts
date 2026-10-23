import type { ParsedDocument } from "../../domain/document.ts";
import type { TextChunk } from "../../domain/chunk.ts";
import type { DocumentChunker } from "../../services/ports/documentChunker.ts";
import { NotImplemented } from "../../domain/errors.ts";

export const documentChunker: DocumentChunker = {
  async chunk(document, options) {
    // TODO: Nối với chunkDocument; giữ section locations, text thường không hiểu heading.
    throw new NotImplemented("documentChunker.chunk");
  },
};

/** Chia tài liệu theo từng section và giữ vị trí nguồn. */
export function chunkDocument(document: ParsedDocument, words: number, overlap: number): TextChunk[] {
  // TODO: Kiểm tra kích thước chunk và overlap hợp lệ.
  // TODO: Chia riêng từng section; giữ nguyên location, không trộn trang/slide.
  // TODO: MD -> chunkMarkdown để giữ heading/code fence.
  // TODO: TXT -> chunkText, không diễn giải ký hiệu Markdown.
  // TODO: PDF -> chunkText cho từng trang, giữ location.page.
  // TODO: PPTX -> chunkText cho từng slide, giữ location.slide.
  // TODO: Video -> chunkText cho từng đoạn transcript, giữ startSeconds/endSeconds.
  // TODO: Không overlap qua section; nếu tách transcript, chưa được suy ra timestamp chính xác theo từ.
  // TODO: Gán ordinal liên tục; không thêm chunk rỗng.
  throw new NotImplemented("chunkDocument");
}

/** Chia Markdown, bảo toàn heading và fenced code. */
export function chunkMarkdown(markdown: string, limitWords: number, overlapWords: number): TextChunk[] {
  // TODO: Kiểm tra limitWords > 0 và 0 <= overlapWords < limitWords.
  // TODO: Chuẩn hóa xuống dòng, đọc heading để tạo headingPath.
  // TODO: Chia văn bản, giữ nguyên fenced code, thêm overlap khi phù hợp.
  // TODO: Xử lý code block quá dài; đây là bài tập đếm từ, tokenizer là bước sau.
  throw new NotImplemented("chunkMarkdown");
}

/** Chia text đã trích xuất từ TXT/PDF/PPTX/video; vị trí do chunkDocument gắn lại. */
export function chunkText(text: string, limitWords: number, overlapWords: number): TextChunk[] {
  // TODO: Kiểm tra limitWords/overlapWords; chia theo đoạn và từ, bỏ đoạn rỗng.
  // TODO: Giữ nội dung gốc, không xóa ký tự hoặc diễn giải Markdown syntax.
  // TODO: Giữ offset/alignment nếu sau này cần highlight chính xác hoặc timestamp theo chunk.
  throw new NotImplemented("chunkText");
}

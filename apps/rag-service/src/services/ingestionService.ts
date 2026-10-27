import { processingConfig, type RagConfig } from "../config.ts";
import type { ParsedDocument } from "../domain/document.ts";
import type { ParserInput, ParserRegistry } from "./ports/documentParser.ts";
import type { IngestionDependencies, IngestionService, IndexResult } from "./ports/serviceContracts.ts";
import { InvalidInput, InvalidOutput, NotImplemented } from "../domain/errors.ts";

export function createIngestionService(ports: IngestionDependencies, config: RagConfig): IngestionService {
  // TODO: Nối dependencies với ingestDocument, trả object cho HTTP layer gọi.
  throw new NotImplemented("createIngestionService");
}

export async function parseMaterial(input: ParserInput, parsers: ParserRegistry): Promise<ParsedDocument> {
  if (!Object.hasOwn(parsers, input.format)) {
    throw new InvalidInput("Định dạng không được hỗ trợ");
  }

  if (input.bytes.byteLength === 0) {
    throw new InvalidInput("Tài liệu rỗng");
  }

  if (input.bytes.byteLength > processingConfig.maxBytes) {
    throw new InvalidInput("Tài liệu vượt quá giới hạn dung lượng")
  }

  const parser = parsers[input.format];
  const document = await parser.parse(input);

  if (!document || document.format != input.format) {
    throw new InvalidOutput("Parser trả về sai định dạng");
  }

  if (!Array.isArray(document.sections) || document.sections.length == 0) {
    throw new InvalidOutput("Parser không trả về section");
  }

  const hasContent = document.sections.some(
    section => section.text.trim().length > 0,
  );

  if (!hasContent) {
    throw new InvalidInput("Tài liệu không có nội dung")
  }

  return document;
}

export async function ingestDocument(materialId: string, ports: IngestionDependencies, config: RagConfig): Promise<IndexResult> {
  // TODO: Lấy nguồn từ M2 qua materials port, không nhận raw content từ client.
  // TODO: Theo giả định skeleton, nhận markdown/txt/pdf/video/slide đã published, isRagSource=true.
  // TODO: Kiểm tra nội dung phù hợp loại nguồn; file nhị phân không bắt buộc có inline text.
  // TODO: Nguồn bị thu hồi -> deactivate, giữ chunks đã cited; lỗi fetch không là deletion.
  // TODO: Hash nguồn/metadata/model/dimension/chunker version; bỏ qua nếu không đổi.
  // TODO: Gọi chunker port -> embeddings port -> kiểm tra vector -> activateVersion trong transaction.
  // TODO: Truyền fileName/location/version từ nguồn xuống chunk, giữ citation history.
  // TODO: Giữ version cũ khi lỗi; xử lý concurrent indexing và rollback.
  // TODO: Lấy bytes qua nguồn M2 tin cậy rồi nối parseMaterial; thống nhất DTO file trước tích hợp thật.
  throw new NotImplemented("ingestDocument");
}

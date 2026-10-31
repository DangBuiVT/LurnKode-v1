import { processingConfig, type RagConfig } from "../config.ts";
import type { IndexedChunk } from "../domain/chunk.ts";
import { createSourceVersion } from "./sourceVersion.ts";
import { validateExternalId, validateText, validateAndSnapshotChunks } from "./validation.ts";
import type { ParsedDocument } from "../domain/document.ts";
import type { ParserInput, ParserRegistry } from "./ports/documentParser.ts";
import type { IngestionDependencies, IngestionService, IndexResult } from "./ports/serviceContracts.ts";
import { InvalidInput, InvalidOutput } from "../domain/errors.ts";

export function createIngestionService(ports: IngestionDependencies, config: RagConfig): IngestionService {
  const snapshot = { ...config, processing: { ...config.processing, chunk: { ...config.processing.chunk } } };
  return { ingestDocument: materialId => ingestDocument(materialId, ports, snapshot) };
}

export async function parseMaterial(input: ParserInput, parsers: ParserRegistry, maxBytes = processingConfig.maxBytes): Promise<ParsedDocument> {
  if (!Object.hasOwn(parsers, input.format)) {
    throw new InvalidInput("Định dạng không được hỗ trợ");
  }

  if (input.bytes.byteLength === 0) {
    throw new InvalidInput("Tài liệu rỗng");
  }

  if (input.bytes.byteLength > maxBytes) {
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
  const id = validateExternalId(materialId);
  const state = await ports.vectors.getSourceState(id);
  const source = await ports.materials.getMaterial(id);

  if (source && validateExternalId(source.id) !== id) {
    throw new InvalidOutput("Material response does not match requested ID");
  }
  if (!source || !source.isRagSource || source.courseStatus !== "published" ||
      source.type !== "markdown" || source.textContent === null ||
      (typeof source.textContent === "string" && !source.textContent.trim())) {
    await ports.vectors.deactivateMaterial(id, state.generation);
    return { status: "skipped", chunks: 0 };
  }

  const material = {
    ...source,
    id,
    courseId: validateExternalId(source.courseId),
    chapterId: validateExternalId(source.chapterId),
    lessonId: validateExternalId(source.lessonId),
    title: validateText(source.title, "material title"),
  };
  const content = validateText(material.textContent!, "Markdown content").replace(/\r\n?/g, "\n");
  const bytes = new TextEncoder().encode(content);
  if (!Number.isSafeInteger(config.processing.maxBytes) || config.processing.maxBytes < 1 ||
      bytes.byteLength > config.processing.maxBytes) {
    throw new InvalidInput("Material exceeds the configured byte limit");
  }
  const versionKey = createSourceVersion(material, content, config);
  if (state.activeVersion === versionKey) return { status: "unchanged", chunks: 0 };

  const document = await parseMaterial({ format: "md", bytes }, ports.parsers, config.processing.maxBytes);
  const chunks = await ports.chunker.chunk(document);
  if (!Array.isArray(chunks) || chunks.length === 0) throw new InvalidOutput("Chunker returned no chunks");

  const chunkIds = chunks.map(chunk => `${id}:${versionKey}:${chunk.ordinal}`);
  const historical = state.generation === 0 ? [] : await Promise.all(
    chunkIds.map(chunkId => ports.vectors.getChunkById(chunkId)),
  );
  const canReuse = historical.length === chunks.length && historical.every(chunk => chunk !== null);
  const embeddings = canReuse
    ? historical.map(chunk => chunk!.embedding)
    : await ports.embeddings.embed(chunks.map(chunk => chunk.text), "document");
  if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
    throw new InvalidOutput("Embedding count does not match chunk count");
  }
  const indexedChunks: IndexedChunk[] = chunks.map((chunk, index) => ({
    ...chunk,
    id: chunkIds[index],
    materialId: id,
    courseId: material.courseId,
    chapterId: material.chapterId,
    lessonId: material.lessonId,
    materialTitle: material.title,
    fileName: null,
    versionKey,
    embedding: embeddings[index],
  }));

  let snapshot: IndexedChunk[];
  try {
    snapshot = validateAndSnapshotChunks(id, versionKey, indexedChunks, config.embeddingDim);
  } catch (error) {
    if (error instanceof InvalidInput) throw new InvalidOutput(error.message);
    throw error;
  }
  await ports.vectors.activateVersion(id, versionKey, snapshot, state.generation);
  return { status: "indexed", chunks: snapshot.length };
}

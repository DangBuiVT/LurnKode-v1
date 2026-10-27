import type { ParsedDocument } from "../../domain/document.ts";
import type { TextChunk } from "../../domain/chunk.ts";
import type { DocumentChunker as DocumentChunkerPort, ChunkOptions, ChunkerRegistry } from "../../services/ports/chunker.ts";
import { processingConfig } from "../../config.ts";

function validateChunkOptions(options: ChunkOptions): void {
  const { limitWords, overlapWords } = options;

  if (!Number.isSafeInteger(limitWords) || limitWords <= 0) {
    throw new Error("limitWords phải là số nguyên dương");
  }

  if (!Number.isSafeInteger(overlapWords) || overlapWords < 0 || overlapWords >= limitWords) {
    throw new Error("overlapWords phải nằm trong [0, limitWords)");
  }
}

export class DocumentChunker implements DocumentChunkerPort {
  constructor(
    private readonly chunkers: ChunkerRegistry,
    private readonly options: ChunkOptions = processingConfig.chunk,
  ) {}

  async chunk(document: ParsedDocument): Promise<TextChunk[]> {
    return chunkDocument(document, this.chunkers, this.options);
  }
}

export function chunkDocument(document: ParsedDocument, chunkers: ChunkerRegistry, options: ChunkOptions = processingConfig.chunk): TextChunk[] {
  validateChunkOptions(options);
  const chunkSection = chunkers[document.format];
  const chunks: TextChunk[] = [];

  for (const section of document.sections) {
    for (const chunk of chunkSection(section.text, options)) {
      if (chunk.text.trim().length === 0) continue;

      chunks.push({
        text: chunk.text,
        headingPath: chunk.headingPath,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        ordinal: chunks.length,
        ...(section.location === undefined ? {} : { location: { ...section.location } }),
      });
    }
  }

  return chunks;
}

export function chunkMarkdown(markdown: string, options: ChunkOptions = processingConfig.chunk): TextChunk[] {
  validateChunkOptions(options);

  const normalized = markdown.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");

  type MarkdownBlock = {
    kind: "paragraph" | "code";
    startOffset: number;
    endOffset: number;
    headingPath: string;
    sectionId: number;
  }

  const blocks: MarkdownBlock[] = [];
  const headings: string[] = [];

  let currentLines: string[] = [];
  let currentStart = 0;
  let currentEnd = 0;
  let nextOffset = 0;
  let currentHeadingPath = "";
  let currentSectionId = 0;
  let openBlock: { marker: string; length: number } | null = null;
  for (const line of lines) {
    const lineStart = nextOffset;
    const lineEnd = lineStart + line.length;
    nextOffset = lineEnd + 1;
    const blockMatch = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);

    //Đang ở trong code block
    if (openBlock != null) {
      currentLines.push(line);
      currentEnd = lineEnd;

      const isClose = 
        blockMatch && 
        blockMatch[1][0] === openBlock.marker &&
        blockMatch[1].length >= openBlock.length &&
        blockMatch[2].trim() === "";

      if (isClose) {
        blocks.push({
          kind: "code",
          startOffset: currentStart,
          endOffset: currentEnd,
          headingPath: currentHeadingPath,
          sectionId: currentSectionId,
        });
        currentLines = [];
        openBlock = null;
      }

      continue;
    }

    //Bắt đầu code block
    if (blockMatch) {
      if (currentLines.length > 0) {
        blocks.push({
          kind: "paragraph",
          startOffset: currentStart,
          endOffset: currentEnd,
          headingPath: currentHeadingPath,
          sectionId: currentSectionId,
        });
      }
      currentLines = [line];
      currentStart = lineStart;
      currentEnd = lineEnd;
      openBlock = {marker: blockMatch[1][0], length: blockMatch[1].length};

      continue;
    }

    //Heading
    const headingMatch = line.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*?)|[ \t]*)$/);

    if (headingMatch) {
      if (currentLines.length > 0) {
        blocks.push({
          kind: "paragraph",
          startOffset: currentStart,
          endOffset: currentEnd,
          headingPath: currentHeadingPath,
          sectionId: currentSectionId,
        });
      }

      currentSectionId += 1;
      const level = headingMatch[1].length;
      const title = (headingMatch[2] ?? "")
        .replace(/(?:^|[ \t]+)#+[ \t]*$/, "")
        .trim();

      headings.length = level - 1;
      headings[level - 1] = title;

      currentHeadingPath = headings
        .filter(title => title.length >0) 
        .join(" > ");
      
      currentLines = [line];
      currentStart = lineStart;
      currentEnd = lineEnd;
      
      continue;
    }

    //Paragraph
    if (line.trim() === "") {
      if (currentLines.length > 0) {
        blocks.push({
          kind: "paragraph",
          startOffset: currentStart,
          endOffset: currentEnd,
          headingPath: currentHeadingPath,
          sectionId: currentSectionId,
        });
      }
      currentLines = [];

      continue;
    }

    //Nội dung 
    if (currentLines.length === 0) currentStart = lineStart;
    currentLines.push(line);
    currentEnd = lineEnd;
  }

  if (currentLines.length > 0) {
    blocks.push({
      kind: openBlock === null ? "paragraph" : "code",
      startOffset: currentStart,
      endOffset: currentEnd,
      headingPath: currentHeadingPath,
      sectionId: currentSectionId    // Cắt từ nguồn để giữ đúng dòng trắng và offset giữa các paragraph.entSectionId,
    });
  }

  const chunks: TextChunk[] = [];
  let paragraphStart: number | null = null;
  let paragraphEnd = 0;
  let paragraphHeading = "";
  let paragraphSectionId = -1;

  function flushParagraphs(): void {
    if (paragraphStart === null) return;

    for (const chunk of chunkText(normalized.slice(paragraphStart, paragraphEnd), options)) {
      chunks.push({
        text: chunk.text,
        ordinal: chunks.length,
        headingPath: paragraphHeading,
        startOffset: paragraphStart + chunk.startOffset,
        endOffset: paragraphStart + chunk.endOffset,
      });
    }

    paragraphStart = null;
  }

  for (const block of blocks) {
    if (block.kind === "code") {
      flushParagraphs();
      chunks.push({
        text: normalized.slice(block.startOffset, block.endOffset),
        startOffset: block.startOffset,    // Cắt từ nguồn để giữ đúng dòng trắng và offset giữa các paragraph.
        endOffset: block.endOffset,
        ordinal: chunks.length,
        headingPath: block.headingPath,
      });
      continue;
    }

    if (block.sectionId !== paragraphSectionId) {
      flushParagraphs();
    }
    paragraphSectionId = block.sectionId;
    paragraphHeading = block.headingPath;
    if (paragraphStart === null) paragraphStart = block.startOffset;
    paragraphEnd = block.endOffset;
  }

  flushParagraphs();
  return chunks;
}

export function chunkText(text: string, options: ChunkOptions = processingConfig.chunk): TextChunk[] {
  validateChunkOptions(options);
  const { limitWords, overlapWords } = options;

  const words = Array.from(text.matchAll(/\S+/gu));
  if (words.length === 0) return [];

  const chunks: TextChunk[] = [];
  const step = limitWords - overlapWords;

  for (let start = 0; start < words.length; start += step) {
    const end = Math.min(start + limitWords, words.length);
    const firstWord = words[start];
    const lastWord = words[end-1];
    const startOffset = firstWord.index!;
    const endOffset = lastWord.index! + lastWord[0].length;

    chunks.push({
      text: text.slice(startOffset, endOffset),
      ordinal: chunks.length,
      headingPath: "",
      startOffset,
      endOffset
    });

    if (end === words.length) break;
  }
  return chunks;
}

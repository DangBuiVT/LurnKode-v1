import { describe, expect, test } from "bun:test";
import { chunkDocument, chunkMarkdown, chunkText } from "../src/infra/chunkers/documentChunker.ts";
import { createChunkerRegistry } from "../src/infra/chunkers/chunkerRegistry.ts";
import type { TextChunk } from "../src/domain/chunk.ts";

function expectSourceRanges(source: string, chunks: TextChunk[]): void {
  for (const chunk of chunks) {
    expect(Number.isInteger(chunk.startOffset)).toBe(true);
    expect(Number.isInteger(chunk.endOffset)).toBe(true);
    expect(chunk.startOffset).toBeGreaterThanOrEqual(0);
    expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset);
    expect(chunk.endOffset).toBeLessThanOrEqual(source.length);
    expect(source.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
  }
}

describe("chunk source offsets", () => {
  test("TXT dùng chỉ số UTF-16 và offset của overlap", () => {
    const source = "  😀 một\n\thai ba  ";
    const chunks = chunkText(source, { limitWords: 2, overlapWords: 1 });
    expect(chunks.map(chunk => [chunk.startOffset, chunk.endOffset])).toEqual([
      [2, 8], [5, 13], [10, 16],
    ]);
    expectSourceRanges(source, chunks);
  });

  test("Markdown giữ nguyên các dòng trắng và khoảng trắng khi gom paragraph", () => {
    const source = "# A\nđầu\n\n \t\ncuối";
    const chunks = chunkMarkdown(source);
    expect(chunks).toEqual([
      { text: source, ordinal: 0, headingPath: "A", startOffset: 0, endOffset: 16 },
    ]);
    expectSourceRanges(source, chunks);
  });

  test("đoạn lặp cùng heading có offset riêng, không tìm bằng indexOf", () => {
    const source = "# A\nlặp\n# A\nlặp";
    const chunks = chunkMarkdown(source);
    expect(chunks.map(chunk => [chunk.startOffset, chunk.endOffset])).toEqual([[0, 7], [8, 15]]);
    expectSourceRanges(source, chunks);
  });

  test("overlap Markdown quy đổi về vị trí trong section", () => {
    const source = "# A\n\nmột hai\n\n\nba bốn năm sáu";
    const chunks = chunkMarkdown(source, { limitWords: 4, overlapWords: 1 });
    expect(chunks.length).toBeGreaterThan(1);
    expectSourceRanges(source, chunks);
    expect(chunks[1].startOffset).toBeLessThan(chunks[0].endOffset);
  });

  test("offset code gồm fence và giữ thụt dòng", () => {
    const source = "# A\n\n```ts\n  const x = 1;\n```\n\ncuối";
    const chunks = chunkMarkdown(source);
    expect(chunks[1]).toMatchObject({ startOffset: 5, endOffset: 29 });
    expect(chunks[1].text).toBe("```ts\n  const x = 1;\n```");
    expectSourceRanges(source, chunks);
  });

  test("offset code chưa đóng gồm newline cuối file", () => {
    const source = "~~~txt\n  cuối\n";
    const chunks = chunkMarkdown(source);
    expect(chunks[0]).toMatchObject({ startOffset: 0, endOffset: source.length, text: source });
    expectSourceRanges(source, chunks);
  });

  test("Markdown dùng bản chuẩn hóa LF làm nguồn offset", () => {
    const source = "# A\r\n\r\nmột\rhai";
    expectSourceRanges("# A\n\nmột\nhai", chunkMarkdown(source));
  });

  test("chunkDocument giữ offset tương đối của từng trang cùng location", () => {
    const document = { format: "pdf" as const, sections: [
      { text: "một hai ba", location: { page: 1 } },
      { text: "😀 cuối", location: { page: 2 } },
    ] };
    const chunks = chunkDocument(document, createChunkerRegistry(), { limitWords: 2, overlapWords: 0 });
    expect(chunks.map(chunk => [chunk.startOffset, chunk.endOffset, chunk.location])).toEqual([
      [0, 7, { page: 1 }], [8, 10, { page: 1 }], [0, 7, { page: 2 }],
    ]);
    expectSourceRanges(document.sections[0].text, chunks.filter(chunk => chunk.location && "page" in chunk.location && chunk.location.page === 1));
    expectSourceRanges(document.sections[1].text, chunks.filter(chunk => chunk.location && "page" in chunk.location && chunk.location.page === 2));
  });
});

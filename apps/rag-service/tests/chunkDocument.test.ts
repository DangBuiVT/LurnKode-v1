import { describe, expect, test } from "bun:test";
import { chunkDocument, DocumentChunker } from "../src/infra/chunkers/documentChunker.ts";
import type { ChunkerRegistry } from "../src/services/ports/chunker.ts";
import { createChunkerRegistry } from "../src/infra/chunkers/chunkerRegistry.ts";

function registry(): ChunkerRegistry {
  return createChunkerRegistry();
}

describe("chunkDocument", () => {
  test("chia TXT và đánh ordinal liên tục", () => {
    expect(chunkDocument({ format: "txt", sections: [{ text: "một hai ba bốn năm" }] }, registry(), {
      limitWords: 3, overlapWords: 1,
    })).toMatchObject([
      { text: "một hai ba", ordinal: 0, headingPath: "" },
      { text: "ba bốn năm", ordinal: 1, headingPath: "" },
    ]);
  });

  test("Markdown được chia theo heading", () => {
    expect(chunkDocument({ format: "md", sections: [{ text: "# A\nMột\n# B\nHai" }] }, registry())
      .map(chunk => chunk.headingPath)).toEqual(["A", "B"]);
  });

  test.each([
    ["pdf", { page: 1 }, { page: 2 }],
    ["pptx", { slide: 1 }, { slide: 2 }],
    ["video", { startSeconds: 0, endSeconds: 10 }, { startSeconds: 10, endSeconds: 20 }],
  ] as const)("giữ location, không overlap qua section của %s", (format, first, second) => {
    expect(chunkDocument({ format, sections: [
      { text: "một hai ba bốn năm", location: first },
      { text: "sáu bảy", location: second },
    ] }, registry(), { limitWords: 3, overlapWords: 1 })).toMatchObject([
      { text: "một hai ba", ordinal: 0, headingPath: "", location: first },
      { text: "ba bốn năm", ordinal: 1, headingPath: "", location: first },
      { text: "sáu bảy", ordinal: 2, headingPath: "", location: second },
    ]);
  });

  test("section trắng không tạo chunk hoặc làm gián đoạn ordinal", () => {
    expect(chunkDocument({ format: "txt", sections: [
      { text: "Một" }, { text: " \n" }, { text: "Hai" },
    ] }, registry()).map(chunk => [chunk.text, chunk.ordinal])).toEqual([["Một", 0], ["Hai", 1]]);
  });

  test("có thể thay strategy qua registry", () => {
    const strategies = registry();
    strategies.txt = () => [{
      text: "Ngu", ordinal: 99, headingPath: "Riêng", startOffset: 0, endOffset: 3,
    }];
    expect(chunkDocument({ format: "txt", sections: [{ text: "Nguồn" }] }, strategies))
      .toEqual([{ text: "Ngu", ordinal: 0, headingPath: "Riêng", startOffset: 0, endOffset: 3 }]);
  });

  test("class dùng registry và cấu hình đã nhận qua constructor", async () => {
    const chunker = new DocumentChunker(registry(), { limitWords: 2, overlapWords: 0 });
    expect(await chunker.chunk({ format: "txt", sections: [{ text: "một hai ba" }] }))
      .toMatchObject([
        { text: "một hai", ordinal: 0, headingPath: "" },
        { text: "ba", ordinal: 1, headingPath: "" },
      ]);
  });
});

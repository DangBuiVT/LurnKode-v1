import { describe, expect, test } from "bun:test";
import { chunkMarkdown } from "../src/infra/chunkers/documentChunker.ts";

describe("chunkMarkdown", () => {
  test("hai heading trùng path vẫn tách riêng và không overlap sang nhau", () => {
    expect(chunkMarkdown("# Bài\nNội dung đầu\n# Bài\nNội dung sau")).toMatchObject([
      { text: "# Bài\nNội dung đầu", ordinal: 0, headingPath: "Bài" },
      { text: "# Bài\nNội dung sau", ordinal: 1, headingPath: "Bài" },
    ]);
  });

  test("giữ paragraph cuối khi file không có dòng trắng kết thúc", () => {
    expect(chunkMarkdown("Xin chào")).toMatchObject([
      { text: "Xin chào", ordinal: 0, headingPath: "" },
    ]);
  });

  test("tài liệu trắng không tạo chunk", () => {
    expect(chunkMarkdown(" \n\t\n")).toEqual([]);
  });

  test("heading con kế thừa cha và heading cùng cấp thay thế nhánh cũ", () => {
    const chunks = chunkMarkdown("# Python\nGiới thiệu\n## Biến\nNội dung\n## Hàm\nKết thúc");
    expect(chunks).toMatchObject([
      { text: "# Python\nGiới thiệu", ordinal: 0, headingPath: "Python" },
      { text: "## Biến\nNội dung", ordinal: 1, headingPath: "Python > Biến" },
      { text: "## Hàm\nKết thúc", ordinal: 2, headingPath: "Python > Hàm" },
    ]);
  });

  test("heading nhảy cấp, heading rỗng và dấu # đóng", () => {
    const chunks = chunkMarkdown("# Gốc ###\n### Con\nNội dung\n#\nĐoạn mới");
    expect(chunks.map(chunk => chunk.headingPath)).toEqual(["Gốc", "Gốc > Con", ""]);
    expect(chunks[2].text).toBe("#\nĐoạn mới");
  });

  test("overlap qua paragraph cùng heading và giữ xuống dòng", () => {
    const chunks = chunkMarkdown("một hai\n\nba bốn năm sáu bảy", {
      limitWords: 4, overlapWords: 1,
    });
    expect(chunks.map(chunk => chunk.text)).toEqual([
      "một hai\n\nba bốn", "bốn năm sáu bảy",
    ]);
    expect(chunks.map(chunk => chunk.ordinal)).toEqual([0, 1]);
  });

  test("code quá dài vẫn nguyên vẹn, không nhận heading bên trong", () => {
    const code = "```ts\n# không phải heading\n  const a = 1;\n```";
    const chunks = chunkMarkdown(`# Bài\n\n${code}\n\nKết thúc`, {
      limitWords: 4, overlapWords: 1,
    });
    expect(chunks).toMatchObject([
      { text: "# Bài", ordinal: 0, headingPath: "Bài" },
      { text: code, ordinal: 1, headingPath: "Bài" },
      { text: "Kết thúc", ordinal: 2, headingPath: "Bài" },
    ]);
  });

  test("fence ngắn hoặc khác marker không đóng code", () => {
    const code = "````txt\n```\n~~~\n# trong code\n`````";
    expect(chunkMarkdown(`${code}\n\nNgoài code`).map(chunk => chunk.text))
      .toEqual([code, "Ngoài code"]);
  });

  test("giữ code block chưa đóng đến cuối tài liệu", () => {
    const code = "~~~txt\n  chưa đóng\n";
    expect(chunkMarkdown(code)).toMatchObject([
      { text: code, ordinal: 0, headingPath: "" },
    ]);
  });

  test("chuẩn hóa xuống dòng CRLF", () => {
    expect(chunkMarkdown("# Bài\r\nVăn bản")[0]).toMatchObject({
      text: "# Bài\nVăn bản", ordinal: 0, headingPath: "Bài",
    });
  });
});

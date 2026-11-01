import { describe, expect, it } from "bun:test";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  calculateMeta,
  parsePagination,
  toOffset,
} from "@/utils/pagination";

describe("parsePagination", () => {
  it("returns defaults when query is empty", () => {
    const result = parsePagination({});
    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  it("parses valid string page and limit", () => {
    const result = parsePagination({ page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("parses valid number page and limit", () => {
    const result = parsePagination({ page: 5, limit: 25 });
    expect(result.page).toBe(5);
    expect(result.limit).toBe(25);
  });

  it("clamps limit to MAX_LIMIT", () => {
    const result = parsePagination({ limit: "999" });
    expect(result.limit).toBe(MAX_LIMIT);
  });

  it("clamps numeric limit to MAX_LIMIT", () => {
    const result = parsePagination({ limit: 200 });
    expect(result.limit).toBe(MAX_LIMIT);
  });

  it("falls back to default on zero page", () => {
    const result = parsePagination({ page: "0" });
    expect(result.page).toBe(DEFAULT_PAGE);
  });

  it("falls back to default on negative page", () => {
    const result = parsePagination({ page: "-1" });
    expect(result.page).toBe(DEFAULT_PAGE);
  });

  it("falls back to default on non-numeric string", () => {
    const result = parsePagination({ page: "abc", limit: "xyz" });
    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  it("falls back to default on decimal string", () => {
    const result = parsePagination({ page: "1.5" });
    expect(result.page).toBe(DEFAULT_PAGE);
  });

  it("falls back to default when undefined", () => {
    const result = parsePagination({ page: undefined, limit: undefined });
    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });
});

describe("calculateMeta", () => {
  it("computes meta correctly for normal case", () => {
    const meta = calculateMeta(2, 20, 55);
    expect(meta.page).toBe(2);
    expect(meta.limit).toBe(20);
    expect(meta.totalItems).toBe(55);
    expect(meta.totalPages).toBe(3); // ceil(55/20)
  });

  it("returns 0 totalPages for 0 totalItems", () => {
    const meta = calculateMeta(1, 20, 0);
    expect(meta.totalPages).toBe(0);
  });

  it("handles exact page boundary", () => {
    const meta = calculateMeta(1, 10, 10);
    expect(meta.totalPages).toBe(1);
  });

  it("falls back to DEFAULT_PAGE on invalid page", () => {
    const meta = calculateMeta(0, 20, 10);
    expect(meta.page).toBe(DEFAULT_PAGE);
  });

  it("falls back to DEFAULT_LIMIT on invalid limit", () => {
    const meta = calculateMeta(1, 0, 10);
    expect(meta.limit).toBe(DEFAULT_LIMIT);
  });

  it("clamps limit to MAX_LIMIT", () => {
    const meta = calculateMeta(1, 500, 10);
    expect(meta.limit).toBe(MAX_LIMIT);
  });

  it("falls back to 0 on negative totalItems", () => {
    const meta = calculateMeta(1, 20, -1);
    expect(meta.totalItems).toBe(0);
  });
});

describe("toOffset", () => {
  it("returns 0 for first page", () => {
    expect(toOffset(1, 20)).toBe(0);
  });

  it("computes correct offset for later pages", () => {
    expect(toOffset(2, 20)).toBe(20);
    expect(toOffset(3, 20)).toBe(40);
    expect(toOffset(5, 10)).toBe(40);
  });

  it("throws RangeError for page < 1", () => {
    expect(() => toOffset(0, 20)).toThrow(RangeError);
    expect(() => toOffset(-1, 20)).toThrow(RangeError);
  });

  it("throws RangeError for limit < 1", () => {
    expect(() => toOffset(1, 0)).toThrow(RangeError);
    expect(() => toOffset(1, -5)).toThrow(RangeError);
  });

  it("throws RangeError for limit > MAX_LIMIT", () => {
    expect(() => toOffset(1, MAX_LIMIT + 1)).toThrow(RangeError);
  });

  it("accepts limit equal to MAX_LIMIT", () => {
    expect(toOffset(1, MAX_LIMIT)).toBe(0);
    expect(toOffset(2, MAX_LIMIT)).toBe(MAX_LIMIT);
  });
});

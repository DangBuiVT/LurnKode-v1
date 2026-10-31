import { describe, expect, it } from "bun:test";
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from "@/utils/response";

describe("successResponse", () => {
  it("wraps data with success: true", () => {
    const result = successResponse({ id: "1", name: "Alice" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "1", name: "Alice" });
  });

  it("accepts null as data", () => {
    const result = successResponse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("accepts array as data", () => {
    const result = successResponse([1, 2, 3]);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([1, 2, 3]);
  });
});

describe("errorResponse", () => {
  it("returns error envelope with code and message", () => {
    const result = errorResponse("NOT_FOUND", "Resource not found");
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("NOT_FOUND");
    expect(result.error.message).toBe("Resource not found");
    expect(result.error.details).toBeUndefined();
  });

  it("omits details key when details is undefined", () => {
    const result = errorResponse("BAD_REQUEST", "Invalid input");
    expect("details" in result.error).toBe(false);
  });

  it("includes details when provided", () => {
    const details = [{ field: "email", message: "Invalid email" }];
    const result = errorResponse("VALIDATION_ERROR", "Validation failed", details);
    expect(result.error.details).toEqual(details);
  });

  it("accepts any type as details", () => {
    const result = errorResponse("CONFLICT", "Duplicate", { field: "email" });
    expect(result.error.details).toEqual({ field: "email" });
  });
});

describe("paginatedResponse", () => {
  it("calculates totalPages correctly", () => {
    const result = paginatedResponse([], 1, 20, 45);
    expect(result.meta.totalPages).toBe(3); // ceil(45/20)
    expect(result.meta.totalItems).toBe(45);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(20);
  });

  it("returns data array in success envelope", () => {
    const data = [{ id: "1" }, { id: "2" }];
    const result = paginatedResponse(data, 1, 10, 2);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
  });

  it("handles zero totalItems", () => {
    const result = paginatedResponse([], 1, 20, 0);
    expect(result.meta.totalItems).toBe(0);
    expect(result.meta.totalPages).toBe(0); // ceil(0/20) = 0
  });

  it("handles exact page boundary", () => {
    const result = paginatedResponse([], 2, 20, 40);
    expect(result.meta.totalPages).toBe(2); // ceil(40/20)
  });

  it("falls back to safe values on invalid page", () => {
    const result = paginatedResponse([], -1, 20, 10);
    expect(result.meta.page).toBe(1);
  });

  it("falls back to safe values on invalid limit", () => {
    const result = paginatedResponse([], 1, 0, 10);
    expect(result.meta.limit).toBe(1);
  });

  it("falls back to zero on negative totalItems", () => {
    const result = paginatedResponse([], 1, 20, -5);
    expect(result.meta.totalItems).toBe(0);
  });
});

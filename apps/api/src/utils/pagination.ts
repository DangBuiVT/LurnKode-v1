export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta extends PaginationParams {
  totalItems: number;
  totalPages: number;
}

type QueryValue = string | number | undefined;

function parsePositiveInteger(value: QueryValue, fallback: number): number {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePagination(query: { page?: QueryValue; limit?: QueryValue }): PaginationParams {
  return {
    page: parsePositiveInteger(query.page, DEFAULT_PAGE),
    limit: Math.min(parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT),
  };
}

export function calculateMeta(page: number, limit: number, totalItems: number): PaginationMeta {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : DEFAULT_PAGE;
  const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;
  const safeTotal = Number.isSafeInteger(totalItems) && totalItems >= 0 ? totalItems : 0;
  return { page: safePage, limit: safeLimit, totalItems: safeTotal, totalPages: Math.ceil(safeTotal / safeLimit) };
}

export function toOffset(page: number, limit: number): number {
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`Invalid pagination values: page=${page}, limit=${limit}`);
  }
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) throw new RangeError("Pagination offset exceeds the safe integer range");
  return offset;
}

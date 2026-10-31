export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  meta: PaginationMeta;
}

export function successResponse<T>(data: T): SuccessResponse<T> {
  return { success: true, data };
}

export const ok = successResponse;

export function errorResponse(code: string, message: string, details?: unknown): ErrorResponse {
  return {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
}

export const fail = errorResponse;

export function paginatedResponse<T>(data: T[], page: number, limit: number, totalItems: number): PaginatedResponse<T> {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? limit : 1;
  const safeTotal = Number.isSafeInteger(totalItems) && totalItems >= 0 ? totalItems : 0;
  return {
    success: true,
    data,
    meta: { page: safePage, limit: safeLimit, totalItems: safeTotal, totalPages: Math.ceil(safeTotal / safeLimit) },
  };
}

/** Compatibility helper for M2 callers; totalItems is canonical, total remains during migration. */
export function paginated<T>(data: T[], page: number, limit: number, total: number) {
  const response = paginatedResponse(data, page, limit, total);
  return { ...response, meta: { ...response.meta, total } };
}

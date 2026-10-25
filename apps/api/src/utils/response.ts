export function ok<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}

export function paginated<T>(data: T[], page: number, limit: number, total: number) {
  return {
    success: true as const,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export function fail(code: string, message: string, details?: Record<string, unknown>) {
  return {
    success: false as const,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}
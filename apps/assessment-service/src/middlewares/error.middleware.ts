/**
 * @file middlewares/error.middleware.ts
 * @description Standardized microservice error formatting.
 */

export interface ServiceErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Typed error carrying an HTTP status code across service/route boundaries.
 * Routes map this with `handleRouteError` instead of collapsing everything to 400.
 */
export class ServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function formatServiceError(
  statusCode: number,
  error: string,
  message: string,
  details?: unknown
): ServiceErrorResponse {
  return {
    statusCode,
    error,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Converts a thrown value into an HTTP status + JSON body.
 * Unexpected errors are logged and reported as 500 rather than leaking internals.
 */
export function handleRouteError(
  err: unknown,
  set: { status?: number | string }
): { error: string; details?: unknown } {
  if (err instanceof ServiceError) {
    set.status = err.statusCode;
    return {
      error: err.message,
      ...(err.details === undefined ? {} : { details: err.details }),
    };
  }

  console.error("[Unhandled route error]", err);
  set.status = 500;
  return { error: "Internal server error" };
}

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


import { Elysia } from "elysia";
import { errorResponse } from "../utils/response";
import { logger } from "../utils/logger";

interface ApiError extends Error {
  code?: string;
  status?: number;
  statusCode?: number;
  details?: unknown;
  /** Elysia validation error details array */
  all?: unknown;
}

function errorStatus(error: ApiError): number {
  if (error.code === "VALIDATION") return 422;
  if (error.code === "PARSE") return 400;
  if (error.code === "NOT_FOUND") return 404;
  const status = error.status ?? error.statusCode;
  return status !== undefined && status >= 400 && status <= 599 ? status : 500;
}

function stableCode(status: number, error: ApiError): string {
  if (status >= 500) return "INTERNAL_SERVER_ERROR";
  if (error.code && /^[A-Z][A-Z0-9_]*$/.test(error.code) && !["VALIDATION", "PARSE"].includes(error.code)) {
    return error.code;
  }
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  return "REQUEST_ERROR";
}

export function errorHandlerPlugin() {
  return new Elysia({ name: "error-handler" })
    .onError({ as: "global" }, ({ code, error, set }) => {
      const apiError = error as ApiError;
      const elysiaCode = typeof code === "number" ? String(code) : code;
      const status = errorStatus({ ...apiError, code: apiError.code ?? elysiaCode });
      set.status = status;

      if (status >= 500) {
        logger.error("Request failed", { error: apiError, errorCode: code, status });
      }

      if (status === 204) return undefined;
      const message = status >= 500 ? "An unexpected error occurred" : (apiError.message || elysiaCode);
      const details = status === 422 ? apiError.all : apiError.details;
      return errorResponse(stableCode(status, { ...apiError, code: apiError.code ?? elysiaCode }), message, details);
    });
}

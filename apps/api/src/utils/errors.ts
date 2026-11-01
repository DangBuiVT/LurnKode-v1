export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  BadRequest: (code: string, message: string, details?: Record<string, unknown>) =>
    new AppError(400, code, message, details),
  Unauthorized: (message = 'Missing, expired, or malformed JWT token.') =>
    new AppError(401, 'UNAUTHORIZED', message),
  Forbidden: (code: string, message: string, details?: Record<string, unknown>) =>
    new AppError(403, code, message, details),
  NotFound: (resource: string) =>
    new AppError(404, 'RESOURCE_NOT_FOUND', `${resource} not found.`),
  Conflict: (code: string, message: string, details?: Record<string, unknown>) =>
    new AppError(409, code, message, details),
};
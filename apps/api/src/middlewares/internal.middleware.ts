import { env } from '../config/env';
import { Errors } from '../utils/errors';

export function verifyInternalServiceKey(headers: Record<string, string | undefined>) {
  const key = headers['x-internal-service-key'];
  if (!key || !env.INTERNAL_SERVICE_KEY || key !== env.INTERNAL_SERVICE_KEY) {
    throw Errors.Unauthorized('Invalid or missing X-Internal-Service-Key header.');
  }
}

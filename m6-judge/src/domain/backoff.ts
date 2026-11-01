export const MAX_CALLBACK_ATTEMPTS = 8;
const BASE_MS = 1000;
const CAP_MS = 60_000;

export type DeliveryClass = "ack" | "retry" | "fatal";

/** 2xx ack; 408/429/5xx/network → retry; other 4xx → stop and keep for operator remediation. */
export function classifyCallbackStatus(status: number): DeliveryClass {
  if (status >= 200 && status < 300) return "ack";
  if (status === 0 || status === 408 || status === 429 || status >= 500) return "retry";
  return "fatal";
}

/** Exponential backoff with up to +50% jitter, capped. `attempt` starts at 1. */
export function backoffDelayMs(attempt: number, rand: () => number = Math.random): number {
  const exp = Math.min(CAP_MS, BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.min(CAP_MS, Math.round(exp * (1 + 0.5 * rand())));
}

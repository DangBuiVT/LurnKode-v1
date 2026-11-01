import { ApiResponse } from "./types";

export function getApiBaseUrl(): string {
  // Browser requests stay same-origin; the Next.js route handler forwards them
  // to the backend using the server-only API_URL environment variable.
  if (typeof window !== "undefined") return "/api/backend";

  return process.env.API_URL?.replace(/\/+$/, "") || "http://localhost:8000";
}

export const API_BASE_URL = getApiBaseUrl();

const ACCESS_TOKEN_KEY = "lurnkode_access_token";

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Access token storage helpers (safe for both browser and SSR)
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  document.cookie = `${ACCESS_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export interface RequestOptions extends RequestInit {
  token?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, query, headers: customHeaders, ...fetchOptions } = options;

  const baseUrl = getApiBaseUrl();
  let url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  if (query) {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const activeToken = token ?? getStoredToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (activeToken) {
    headers["Authorization"] = `Bearer ${activeToken}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: "include", // Đảm bảo cookie refresh_token (HttpOnly) được gửi kèm
    });

    if (response.status === 204) {
      return null as T;
    }

    const json = (await response.json()) as ApiResponse<T>;

    if (!response.ok || json.success === false) {
      const err = json.error || {
        code: "HTTP_ERROR",
        message: response.statusText || "Request failed",
      };
      throw new ApiClientError(
        response.status,
        err.code,
        err.message,
        err.details
      );
    }

    return json.data;
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiClientError(0, "NETWORK_ERROR", message);
  }
}


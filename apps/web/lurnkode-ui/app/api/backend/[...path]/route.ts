import type { NextRequest } from "next/server";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const backendUrl = process.env.API_URL?.replace(/\/+$/, "");
  if (!backendUrl) {
    return Response.json(
      { success: false, error: { code: "API_URL_NOT_CONFIGURED", message: "Backend API is not configured" } },
      { status: 503 },
    );
  }

  const { path } = await context.params;
  const targetUrl = new URL(
    `${backendUrl}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
  );
  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);
  headers.delete("host");

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
    ...(request.method === "GET" || request.method === "HEAD" ? {} : { duplex: "half" as const }),
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const header of HOP_BY_HOP_HEADERS) responseHeaders.delete(header);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export const GET = (request: NextRequest, context: RouteContext) => proxyRequest(request, context);
export const HEAD = (request: NextRequest, context: RouteContext) => proxyRequest(request, context);
export const POST = (request: NextRequest, context: RouteContext) => proxyRequest(request, context);
export const PUT = (request: NextRequest, context: RouteContext) => proxyRequest(request, context);
export const PATCH = (request: NextRequest, context: RouteContext) => proxyRequest(request, context);
export const DELETE = (request: NextRequest, context: RouteContext) => proxyRequest(request, context);
export const OPTIONS = (request: NextRequest, context: RouteContext) => proxyRequest(request, context);

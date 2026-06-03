import { buildBackendAuthHeaders } from "@/lib/backend-auth";

export const DEFAULT_FORWARDED_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-range",
  "content-disposition",
  "content-type",
  "etag",
  "last-modified",
  "x-trace-id",
] as const;

export function getBackendApiBaseUrl() {
  const apiUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  return apiUrl.replace(/\/$/, "");
}

export function buildBackendUrl(path: string) {
  return `${getBackendApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchBackend(
  path: string,
  init: RequestInit & {
    userId?: string;
    extraHeaders?: HeadersInit;
    timeoutMs?: number;
  } = {},
) {
  const { userId, extraHeaders, headers, timeoutMs, ...rest } = init;

  let signal = rest.signal;
  let timeoutId: NodeJS.Timeout | undefined;

  if (timeoutMs && !signal) {
    if ("timeout" in AbortSignal) {
      signal = (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(timeoutMs);
    } else {
      const controller = new AbortController();
      signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }
  }

  try {
    const res = await fetch(buildBackendUrl(path), {
      ...rest,
      signal,
      headers: {
        ...(userId ? buildBackendAuthHeaders(userId) : {}),
        ...(headers ?? {}),
        ...(extraHeaders ?? {}),
      },
    });
    return res;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function createProxyResponse(
  upstream: Response,
  forwardedHeaders: readonly string[] = DEFAULT_FORWARDED_HEADERS,
) {
  const responseHeaders = new Headers();
  for (const headerName of forwardedHeaders) {
    const value = upstream.headers.get(headerName);
    if (value) {
      responseHeaders.set(headerName, value);
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function createTextProxyResponse(
  upstream: Response,
  contentTypeFallback = "application/json",
) {
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || contentTypeFallback,
      ...(upstream.headers.get("x-trace-id")
        ? { "x-trace-id": upstream.headers.get("x-trace-id") as string }
        : {}),
    },
  });
}

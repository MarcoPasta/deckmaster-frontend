/**
 * Base URL for every API request, set via the VITE_API_BASE_URL env variable.
 * All paths passed to `api.*` are appended directly to this value.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** Options accepted by the internal `request` helper. */
type RequestOptions = {
  /** Extra headers merged on top of the default Content-Type / Authorization. */
  headers?: Record<string, string>;
  /** Key-value pairs appended as URL search parameters. */
  params?: Record<string, string>;
  /** Request body; will be JSON-serialised before sending. */
  body?: unknown;
  /** Optional AbortSignal to cancel the request mid-flight. */
  signal?: AbortSignal;
};

/**
 * Core fetch wrapper used by every method on the `api` object.
 *
 * - Appends `params` as query-string entries.
 * - Injects `Authorization: Bearer <token>` when a token is provided.
 * - Throws `ApiError` for any non-2xx response, carrying the HTTP status and
 *   the raw response body so callers can display a meaningful message.
 * - Returns `undefined` for 204 No Content or an empty body.
 */
async function request<T>(
  method: string,
  path: string,
  token?: string | null,
  options: RequestOptions = {},
): Promise<T> {
  const url = new URL(BASE_URL + path);

  // Append query parameters, if any.
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Attach the Clerk JWT when the caller is authenticated.
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!res.ok) {
    // Try to extract a human-readable error message from the body.
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }

  // 204 No Content — no body to parse.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * Thrown by `api.*` whenever the server returns a non-2xx status.
 * Callers can `instanceof` check this to distinguish network errors from
 * deliberate API error responses.
 */
export class ApiError extends Error {
  constructor(status: number, body: string) {
    super(`API error ${status}: ${body}`);
    this.name = "ApiError";
  }
}

/**
 * Thin, typed facade over the raw `fetch` API.
 *
 * All methods accept an optional `token` (Clerk JWT) and `RequestOptions`.
 * Use `useApi()` from the composables layer rather than calling this directly
 * — it handles token retrieval and exposes reactive `loading`/`error` state.
 */
export const api = {
  /** Issue a GET request and deserialise the JSON response as `T`. */
  get<T>(path: string, token?: string | null, options?: RequestOptions) {
    return request<T>("GET", path, token, options);
  },
  /** Issue a POST request with an optional JSON body. */
  post<T>(path: string, token?: string | null, options?: RequestOptions) {
    return request<T>("POST", path, token, options);
  },
  /** Issue a PUT request (full resource replacement). */
  put<T>(path: string, token?: string | null, options?: RequestOptions) {
    return request<T>("PUT", path, token, options);
  },
  /** Issue a PATCH request (partial resource update). */
  patch<T>(path: string, token?: string | null, options?: RequestOptions) {
    return request<T>("PATCH", path, token, options);
  },
  /** Issue a DELETE request. */
  delete<T>(path: string, token?: string | null, options?: RequestOptions) {
    return request<T>("DELETE", path, token, options);
  },

  /**
   * POST a `multipart/form-data` payload (e.g. file uploads).
   * Unlike `post()`, no `Content-Type` header is set — the browser fills in
   * the correct `multipart/form-data; boundary=…` value automatically.
   */
  async postForm<T>(
    path: string,
    token?: string | null,
    formData?: FormData,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(BASE_URL + path);
    const headers: Record<string, string> = { ...options.headers };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: formData,
      signal: options.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(res.status, text || res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  },

  /**
   * GET a binary resource (e.g. generated deck images) and return it as a
   * `Blob`. Used when the response is not JSON — the caller can then create
   * an object URL with `URL.createObjectURL(blob)`.
   */
  async getBlob(
    path: string,
    token?: string | null,
    options: RequestOptions = {},
  ): Promise<Blob> {
    const url = new URL(BASE_URL + path);
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }
    const headers: Record<string, string> = { ...options.headers };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: options.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(res.status, text || res.statusText);
    }
    return res.blob();
  },
};

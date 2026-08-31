import { useSession } from "@clerk/vue";
import { ref } from "vue";
import { api, ApiError } from "@/services/api";

/**
 * Authenticated API composable.
 *
 * Wraps every method from `api` with:
 * - Automatic Clerk JWT injection (calls `session.getToken()` before each request).
 * - A shared `loading` ref that is `true` for the duration of any in-flight call.
 * - A shared `error` ref that holds the last `ApiError` (or `null` on success).
 *
 * All views and composables should use this rather than calling `api` directly.
 */
export function useApi() {
  const { session } = useSession();

  /** True while any request initiated by this composable instance is in flight. */
  const loading = ref(false);

  /** The most recent API error, or null if the last call succeeded. */
  const error = ref<ApiError | null>(null);

  /**
   * Retrieves the current Clerk session JWT.
   * Returns `null` when the user is not authenticated so callers can still
   * issue public (unauthenticated) requests.
   */
  async function getToken() {
    return (await session.value?.getToken()) ?? null;
  }

  /** Authenticated GET. Appends optional query params to the URL. */
  async function get<T>(path: string, params?: Record<string, string>) {
    loading.value = true;
    error.value = null;
    try {
      const token = await getToken();
      return await api.get<T>(path, token, { params });
    } catch (e) {
      error.value = e instanceof ApiError ? e : null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Authenticated POST with an optional JSON body. */
  async function post<T>(path: string, body?: unknown) {
    loading.value = true;
    error.value = null;
    try {
      const token = await getToken();
      return await api.post<T>(path, token, { body });
    } catch (e) {
      error.value = e instanceof ApiError ? e : null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Authenticated PUT (full resource replacement) with an optional JSON body. */
  async function put<T>(path: string, body?: unknown) {
    loading.value = true;
    error.value = null;
    try {
      const token = await getToken();
      return await api.put<T>(path, token, { body });
    } catch (e) {
      error.value = e instanceof ApiError ? e : null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Authenticated PATCH (partial resource update) with an optional JSON body. */
  async function patch<T>(path: string, body?: unknown) {
    loading.value = true;
    error.value = null;
    try {
      const token = await getToken();
      return await api.patch<T>(path, token, { body });
    } catch (e) {
      error.value = e instanceof ApiError ? e : null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Authenticated DELETE. */
  async function del<T>(path: string) {
    loading.value = true;
    error.value = null;
    try {
      const token = await getToken();
      return await api.delete<T>(path, token);
    } catch (e) {
      error.value = e instanceof ApiError ? e : null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Authenticated multipart POST (file uploads).
   * Does not set Content-Type so the browser can supply the correct boundary.
   */
  async function postForm<T>(path: string, formData: FormData) {
    loading.value = true;
    error.value = null;
    try {
      const token = await getToken();
      return await api.postForm<T>(path, token, formData);
    } catch (e) {
      error.value = e instanceof ApiError ? e : null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Authenticated GET that returns a raw `Blob` instead of parsed JSON.
   * Used for binary resources such as generated deck images.
   */
  async function getBlob(path: string, params?: Record<string, string>) {
    loading.value = true;
    error.value = null;
    try {
      const token = await getToken();
      return await api.getBlob(path, token, { params });
    } catch (e) {
      error.value = e instanceof ApiError ? e : null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { get, post, put, patch, del, postForm, getBlob, loading, error };
}

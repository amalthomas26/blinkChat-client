import { env } from "../config/env";

const API_URL = env.API_URL;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

function handleUnauthorized(): void {
  // Clear the full auth state (including localStorage via zustand persist)
  // before navigating away. We import lazily to avoid circular-dep issues.
  import("../store/auth.store").then(({ useAuthStore }) => {
    // Reset to a clean unauthenticated state. This also wipes the
    // persisted localStorage entry so initAuth won't try a stale refresh.
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      error: null,
    });
    window.location.href = "/login";
  });
}

// ── Token refresh mutex ──────────────────────────────────────────
// Only one refresh request at a time. Concurrent 401s wait for
// the first refresh to finish, then all retry with the new token.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) return null;

      const body = await res.json();
      const newToken: string | undefined = body?.data?.accessToken;
      if (!newToken) return null;

      // Store the new token in memory
      const { useAuthStore } = await import("../store/auth.store");
      useAuthStore.getState().setAccessToken(newToken);
      return newToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = `${API_URL}${endpoint}`;
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const { useAuthStore } = await import("../store/auth.store");
  const token = useAuthStore.getState().accessToken;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // ── On 401, try silent refresh before giving up ──────────
  if (response.status === 401) {
    // Don't try to refresh the refresh endpoint itself
    if (endpoint === "/auth/refresh") {
      handleUnauthorized();
      throw new ApiError(401, "Session expired, please log in again.");
    }

    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry the original request with the fresh token
      const retryHeaders = new Headers(options.headers);
      if (!(options.body instanceof FormData)) {
        retryHeaders.set("Content-Type", "application/json");
      }
      retryHeaders.set("Authorization", `Bearer ${newToken}`);

      const retryResponse = await fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: "include",
      });

      let retryData;
      try {
        retryData = await retryResponse.json();
      } catch {
        // Not JSON - leave data undefined
      }

      if (!retryResponse.ok) {
        if (retryResponse.status === 401) {
          handleUnauthorized();
          throw new ApiError(401, "Session expired, please log in again.");
        }
        const message = retryData?.message || "An unexpected error occurred";
        throw new ApiError(retryResponse.status, message, retryData);
      }

      return retryData as T;
    }

    // Refresh failed — force logout
    handleUnauthorized();
    throw new ApiError(401, "Session expired, please log in again.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    // Not JSON - leave data undefined
  }

  if (!response.ok) {
    const message = data?.message || "An unexpected error occurred";
    throw new ApiError(response.status, message, data);
  }

  return data as T;
};

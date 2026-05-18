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
  import("../store/auth.store").then(({ useAuthStore }) => {
    const { setUser } = useAuthStore.getState();
    setUser(null);
  });
  window.location.href = "/login";
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

  let data;
  try {
    data = await response.json();
  } catch {
    // Not JSON - keave data undefined
  }

  if (response.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, "'Session expired please log in again.");
  }

  if (!response.ok) {
    const message = data?.message || "An unexpected error occurred";
    throw new ApiError(response.status, message, data);
  }

  return data as T;
};

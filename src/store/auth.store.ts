import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, LoginData, RegisterData } from "../types/auth.types";
import { authService } from "../services/auth.service";
import { ApiError } from "../lib/api";

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleAuth: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  initAuth: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,
      login: async (data: LoginData) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authService.login(data);
          set({
            user: response.data.user,
            accessToken: response.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          const message =
            error instanceof ApiError ? error.message : "Login failed";
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authService.register(data);
          // Note: register endpoint returns user data only, no accessToken.
          // The user must log in separately after registering to get a token.
          set({
            user: response.data.user,
            isAuthenticated: false, // not authenticated until they log in
            isLoading: false,
          });
        } catch (error: unknown) {
          const message =
            error instanceof ApiError ? error.message : "Registration failed";
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      googleAuth: async (token: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authService.googleAuth(token);
          set({
            user: response.data.user,
            accessToken: response.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          const message =
            error instanceof ApiError
              ? error.message
              : "Google authentication failed";
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      logout: async () => {
        try {
          set({ isLoading: true, error: null });
          await authService.logout();
        } catch {
          // Ignore logout errors — force clear the client state anyway
        } finally {
          set({ ...initialState, isInitializing: false });
        }
      },
      clearError: () => set({ error: null }),

      setUser: (user: User | null) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setAccessToken: (token: string | null) =>
        set({ accessToken: token }),

      // Called once on app startup. If localStorage says we're
      // authenticated but the in-memory access token is gone (page
      // refresh), silently obtain a fresh one via the httpOnly cookie.
      initAuth: async () => {
        const { isAuthenticated, accessToken } = useAuthStore.getState();
        if (!isAuthenticated || accessToken) {
          set({ isInitializing: false });
          return;
        }

        try {
          const res = await fetch(
            `${(await import("../config/env")).env.API_URL}/auth/refresh`,
            { method: "POST", credentials: "include" },
          );
          if (!res.ok) throw new Error("refresh failed");
          const body = await res.json();
          set({ accessToken: body.data.accessToken, isInitializing: false });
        } catch {
          // Refresh cookie is gone / expired → force logout
          set({ ...initialState, isInitializing: false });
        }
      },
    }),
    {
      name: "blinkchat-auth",
      partialize: (state) => ({
        user: state.user,
        // accessToken is intentionally NOT persisted — it lives in
        // memory only, so an XSS attack cannot steal it from localStorage.
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Cross-tab synchronization
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "blinkchat-auth") {
      // Zustand's persist middleware automatically writes to localStorage,
      // but doesn't auto-hydrate on changes from OTHER tabs in older versions.
      // We manually call rehydrate to update this tab's memory state.
      useAuthStore.persist.rehydrate();
    }
  });
}

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
  error: string | null;
}

export interface AuthActions {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleAuth: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
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
          set({
            user: response.data.user,
            accessToken: response.data.accessToken,
            isAuthenticated: true,
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
          set({ ...initialState });
        } catch (error: unknown) {
          const message =
            error instanceof ApiError ? error.message : "Logout failed";
          set({ error: message, isLoading: false });
          set({ ...initialState }); // Force logout on client anyway
        }
      },
      clearError: () => set({ error: null }),

      setUser: (user: User | null) =>
        set({
          user,
          isAuthenticated: !!user,
        }),
    }),
    {
      name: "blinkchat-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
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

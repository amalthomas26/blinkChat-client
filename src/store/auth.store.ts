import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, LoginData, RegisterData, LoginResponseSuccess } from "../types/auth.types";
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
  verifyLogin2FA: (email: string, otp: string) => Promise<void>;
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

          if (response.data.requires2FA) {
            set({ isLoading: false });

            const err = new Error("2FA_REQUIRED") as Error & { email: string };
            err.email = response.data.email;
            throw err;
          }

          const successData = response.data as LoginResponseSuccess;
          set({
            user: successData.user,
            accessToken: successData.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: unknown) {


          if (error instanceof Error && error.message === "2FA_REQUIRED") {
            set({ isLoading: false });
            throw error;
          }

          const message =
            error instanceof ApiError ? error.message : "Login failed";
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      verifyLogin2FA: async (email: string, otp: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authService.verifyLogin2FA(email, otp);
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
              : "2FA verification failed";
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

      // Called once on app startup to restore the session on page refresh.
      // Strategy: the httpOnly refresh cookie is the authoritative source of
      // truth for whether a session exists. We always attempt a silent token
      // refresh — we never rely solely on localStorage having a user object,
      // because localStorage can be empty (incognito, cleared storage, a
      // different browser profile) while a valid cookie still exists.
      // This fixes the bug where a second browser profile with a different
      // Google account gets kicked to /login on refresh because localStorage
      // had no user entry for that profile.
      initAuth: async () => {
        // Wait for Zustand persist to finish rehydrating from localStorage
        // before reading state. Without this, there is a race condition:
        // initAuth() can run before onRehydrateStorage() completes, which
        // means `user` is still null even though localStorage has a session.
        if (!useAuthStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) =>
            useAuthStore.persist.onFinishHydration(() => resolve()),
          );
        }

        // If an access token is already in memory (e.g. initAuth called twice),
        // nothing to do — skip the network round-trip entirely.
        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
          set({ isInitializing: false });
          return;
        }

        // Always attempt a silent refresh via the httpOnly cookie.
        // The cookie is sent automatically by the browser (credentials: "include").
        try {
          const { env } = await import("../config/env");

          const res = await fetch(`${env.API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (!res.ok) throw new Error("refresh failed");

          const body = await res.json();
          const newAccessToken: string | undefined = body?.data?.accessToken;
          if (!newAccessToken) throw new Error("no access token in response");

          // Check if we already have the user in localStorage (normal refresh case).
          // If not (empty localStorage but valid cookie — the bug scenario), fetch
          // the user profile from the server using the fresh access token.
          const { user } = useAuthStore.getState();
          if (user) {
            // User already cached locally — just restore the access token.
            set({ accessToken: newAccessToken, isInitializing: false });
          } else {
            // localStorage had no user. Fetch the profile from the server so we
            // can restore the full authenticated state (user + accessToken).
            const profileRes = await fetch(`${env.API_URL}/user/me`, {
              headers: { Authorization: `Bearer ${newAccessToken}` },
              credentials: "include",
            });

            if (!profileRes.ok) throw new Error("profile fetch failed");

            const profileBody = await profileRes.json();
            const fetchedUser = profileBody?.data;
            if (!fetchedUser) throw new Error("no user data in profile response");

            set({
              accessToken: newAccessToken,
              user: fetchedUser,
              isAuthenticated: true,
              isInitializing: false,
            });
          }
        } catch {
          // Refresh cookie is gone/expired, or profile fetch failed → clean state.
          set({ ...initialState, isInitializing: false });
        }
      },
    }),
    {
      name: "blinkchat-auth",
      partialize: (state) => ({
        user: state.user,
        // isAuthenticated is derived from user at runtime, never persisted.
        // Persisting it would allow localStorage tampering to bypass route guards.
      }),
      // After rehydrating from localStorage, re-derive isAuthenticated from user
      // so it's always consistent with the actual persisted user object.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = state.user !== null;
        }
      },
    }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "blinkchat-auth") {
      useAuthStore.persist.rehydrate();
    }
  });
}

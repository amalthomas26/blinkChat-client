import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "./auth.store";

export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useIsInitializing = () =>
  useAuthStore((state) => state.isInitializing);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

export const useAuthActions = () =>
  useAuthStore(useShallow((state) => ({
    login: state.login,
    register: state.register,
    googleAuth: state.googleAuth,
    logout: state.logout,
    clearError: state.clearError,
    setUser: state.setUser,
    verifyLogin2FA: state.verifyLogin2FA,
  })));
import { apiFetch } from "../lib/api";
import type {
  AuthResponse,
  RegisterData,
  LoginData,
} from "../types/auth.types";

export const authService = {
  register: (data: RegisterData) => {
    return apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  login: (data: LoginData) => {
    return apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  googleAuth: (token: string) => {
    return apiFetch<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  logout: () => {
    return apiFetch<{ success: boolean; message: string }>("/auth/logout", {
      method: "POST",
    });
  },
  forgotPassword: (email: string) => {
    return apiFetch<{ success: boolean; message: string }>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    )
  },
  resetPassword: (data: {
    email: string;
    newPassword: string;
    verifiedToken: string;
  }) => {
    return apiFetch<{ success: boolean; message: string }>(
      "/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

};

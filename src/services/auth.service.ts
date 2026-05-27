import { apiFetch } from "../lib/api";
import type {
  AuthResponse,
  RegisterData,
  LoginData,
  SessionDto,
  LoginResponse,
} from "../types/auth.types";

export const authService = {
  register: (data: RegisterData) => {
    return apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  login: (data: LoginData) => {
    return apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },



  verifyLogin2FA: (email: string, otp: string) => {
    return apiFetch<AuthResponse>("/auth/verify-2fa", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
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
    );
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

  //Password & Session management
  changePassword: (currentPassword: string, newPassword: string) => {
    return apiFetch<{ success: boolean; message: string }>(
      "/auth/change-password",
      {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      },
    );
  },

  getSessions: () => {
    return apiFetch<{ success: boolean; data: SessionDto[] }>(
      "/auth/sessions",
    );
  },

  revokeSession: (sessionId: string) => {
    return apiFetch<{ success: boolean; message: string }>(
      `/auth/sessions/${sessionId}`,
      { method: "DELETE" },
    );
  },

  revokeAllOtherSessions: () => {
    return apiFetch<{ success: boolean; message: string }>(
      "/auth/sessions",
      { method: "DELETE" },
    );
  },
}
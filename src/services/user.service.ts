import { apiFetch } from "../lib/api";
import type {
  UserProfileDto,
  PublicUserProfileDto,
  UserSearchResultDto,
  UpdateProfileInput,
} from "../types";

interface SearchUsersResponse {
  success: boolean;
  data: {
    users: UserSearchResultDto[];
    count: number;
  };
}

interface PresenceEntry {
  userId: string;
  status: "online" | "offline" | "away";
  lastSeen: string | null;
}

interface PresenceResponse {
  success: boolean;
  data: PresenceEntry[];
}

interface SingleUserResponse {
  success: boolean;
  data: UserProfileDto;
}

interface UpdateProfileResponse {
  success: boolean;
  data: UserProfileDto | PublicUserProfileDto;
}

export const userService = {
  getMe: () => apiFetch<SingleUserResponse>("/users/me"),

  getUserById: (id: string) => apiFetch<SingleUserResponse>(`/users/${id}`),

  searchUser: (query: string, signal?: AbortSignal) =>
    apiFetch<SearchUsersResponse>(
      `/users?search=${encodeURIComponent(query)}`,
      { signal },
    ),

  getPresence: (userIds: string[]) =>
    apiFetch<PresenceResponse>(`/users/presence?userIds=${userIds.join(",")}`),

  updateMe: (data: UpdateProfileInput) =>
    apiFetch<UpdateProfileResponse>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteAvatar: () =>
    apiFetch<{ success: boolean; data: UserProfileDto }>("/users/me/avatar", {
      method: "DELETE",
    }),

  deleteAccount: () =>
    apiFetch<{ success: boolean }>("/users/me", {
      method: "DELETE",
    }),

  blockUser: (userId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/${userId}/block`, {
      method: "POST",
    }),

  unblockUser: (userId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/${userId}/block`, {
      method: "DELETE",
    }),

  getBlockedUsers: () =>
    apiFetch<{ success: boolean; data: string[] }>("/users/blocked"),

  toggle2FA: (enable: boolean, password: string) =>
    apiFetch<{ success: boolean; data: { twoFactorEnabled: boolean } }>(
      "/users/me/2fa",
      {
        method: "PATCH",
        body: JSON.stringify({ enable, password }),
      },
    ),

  updateNotificationPrefs: (prefs: Partial<{
    browserNotifications: boolean;
    sounds: boolean;
    muteAll: boolean;
  }>) =>
    apiFetch<{
      success: boolean;
      data: { browserNotifications: boolean; sounds: boolean; muteAll: boolean };
    }>("/users/me/notification-prefs", {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),
  updatePrivacyPrefs: (prefs: Partial<{
    showOnlineStatus: boolean;
    showLastSeen: boolean;
  }>) =>
    apiFetch<{
      success: boolean;
      data: { showOnlineStatus: boolean; showLastSeen: boolean };
    }>("/users/me/privacy-prefs", {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),
};

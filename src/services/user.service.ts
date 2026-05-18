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
};

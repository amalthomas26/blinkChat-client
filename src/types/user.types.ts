import type { NotificationPrefs, PrivacyPrefs } from "./auth.types";

export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  avatar: string;
  bio: string | null;
  status: "online" | "offline" | "away";
  lastSeen: string | null;
  provider: "local" | "google";
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  notificationPrefs: NotificationPrefs;
  privacyPrefs: PrivacyPrefs;
  createdAt: string;
}

export interface PublicUserProfileDto {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  status: "online" | "offline" | "away";
  lastSeen: string | null;
  createdAt: string;
}

export interface UserSearchResultDto {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "away";
}

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
  avatar?: string;
  avatarPublicId?: string;
  username?: string;
}

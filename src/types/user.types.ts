export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string | null;
  status: "online" | "offline" | "away";
  lastSeen: string | null;
  provider: "local" | "google";
  createAt: string;
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
}

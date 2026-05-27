export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  username?: string | null;
  isEmailVerified?: boolean;
  twoFactorEnabled?: boolean;
  notificationPrefs?: NotificationPrefs;
  privacyPrefs?: PrivacyPrefs;

}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: User;
  };
}

export interface LoginResponseSuccess {
  requires2FA?: false;
  accessToken: string;
  user: User;
}

export interface LoginResponse2FA {
  requires2FA: true;
  email: string;
}

export type LoginResponseData = LoginResponseSuccess | LoginResponse2FA;

export interface LoginResponse {
  success: boolean;
  data: LoginResponseData;
}

export interface RegisterData {
  name: string;
  email: string;
  password?: string;
  username?: string;
  verifiedToken?: string;
}

export interface LoginData {
  email: string;
  password?: string;
}

export interface SessionDto {
  sessionId: string;
  device: string;
  ip: string;
  userAgent: string;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface NotificationPrefs {
  browserNotifications: boolean;
  sounds: boolean;
  muteAll: boolean;
}

export interface PrivacyPrefs {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
}


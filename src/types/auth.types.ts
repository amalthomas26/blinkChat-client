export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: User;
  };
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

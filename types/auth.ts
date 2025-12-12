export interface KioskUser {
  username: string;
  passwordHash: string; // SHA-256 hash
  cluster: 'Vijayawada' | 'Nellore' | 'Visakhapatnam';
  displayName: string;
}

export interface AdminUser {
  username: string;
  passwordHash: string;
  role: 'admin';
}

export interface AuthUser {
  username: string;
  role: 'admin' | 'kiosk';
  cluster?: string;
  displayName: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
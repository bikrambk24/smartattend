import { createContext } from 'react';

export type Role = 'teacher' | 'admin';

export interface AuthState {
  token: string | null;
  role: Role | null;
  name: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

type Role = 'student' | 'teacher' | 'admin';

interface AuthState {
  token: string | null;
  role: Role | null;
  name: string | null;
  email: string | null;
  studentId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await AsyncStorage.getItem('token');
      const storedRole = await AsyncStorage.getItem('role');
      const storedName = await AsyncStorage.getItem('name');
      const storedEmail = await AsyncStorage.getItem('email');
      const storedStudentId = await AsyncStorage.getItem('studentId');
      if (storedToken) setToken(storedToken);
      if (storedRole) setRole(storedRole as Role);
      if (storedName) setName(storedName);
      if (storedEmail) setEmail(storedEmail);
      if (storedStudentId) setStudentId(storedStudentId);
      setLoading(false);
    })();
  }, []);

  async function login(emailInput: string, password: string) {
    const res = await api.post<{ token: string; role: Role; name: string; email: string; studentId: string | null }>(
      '/api/auth/login',
      { email: emailInput, password },
      null,
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? 'Login failed' };
    }

    if (res.data.role === 'teacher') {
      return { success: false, error: 'Teachers should use the web dashboard, not the mobile app.' };
    }

    await AsyncStorage.setItem('token', res.data.token);
    await AsyncStorage.setItem('role', res.data.role);
    await AsyncStorage.setItem('name', res.data.name);
    await AsyncStorage.setItem('email', res.data.email ?? '');
    await AsyncStorage.setItem('studentId', res.data.studentId ?? '');

    setToken(res.data.token);
    setRole(res.data.role);
    setName(res.data.name);
    setEmail(res.data.email ?? null);
    setStudentId(res.data.studentId ?? null);

    return { success: true };
  }

  async function logout() {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('role');
    await AsyncStorage.removeItem('name');
    await AsyncStorage.removeItem('email');
    await AsyncStorage.removeItem('studentId');
    setToken(null);
    setRole(null);
    setName(null);
    setEmail(null);
    setStudentId(null);
  }

  return (
    <AuthContext.Provider value={{ token, role, name, email, studentId, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
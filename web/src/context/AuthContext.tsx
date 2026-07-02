import React, { useState } from 'react';
import { api } from '../services/api';
import { AuthContext, type Role } from './AuthContextObject';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [role, setRole] = useState<Role | null>(() => localStorage.getItem('role') as Role | null);
  const [name, setName] = useState<string | null>(() => localStorage.getItem('name'));
  const [loading] = useState(false);

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; role: string; name: string }>(
      '/api/auth/login',
      { email, password },
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? 'Login failed' };
    }

    if (res.data.role !== 'teacher' && res.data.role !== 'admin') {
      return { success: false, error: 'Students should use the mobile app, not the web dashboard.' };
    }

    localStorage.setItem('token', res.data.token);
    localStorage.setItem('role', res.data.role);
    localStorage.setItem('name', res.data.name);

    setToken(res.data.token);
    setRole(res.data.role as Role);
    setName(res.data.name);

    return { success: true };
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setToken(null);
    setRole(null);
    setName(null);
  }

  return (
    <AuthContext.Provider value={{ token, role, name, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
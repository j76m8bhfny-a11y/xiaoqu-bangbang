'use client';

import { create } from 'zustand';
import type { AdminUserDto, AdminLoginResponse } from '@xiaoqu-bangbang/shared';
import api from '@/lib/api';

interface AuthState {
  token: string | null;
  adminUser: AdminUserDto | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  adminUser: null,
  isLoggedIn: false,

  login: async (username: string, password: string) => {
    const res = await api.post<null, { code: number; data: AdminLoginResponse }>(
      '/admin/auth/login',
      { username, password }
    );
    if (res.code !== 0) {
      throw new Error('登录失败');
    }
    const { token, adminUser } = res.data;
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(adminUser));
    set({ token, adminUser, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ token: null, adminUser: null, isLoggedIn: false });
    window.location.href = '/login';
  },

  hydrate: () => {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    if (token && userStr) {
      try {
        const adminUser = JSON.parse(userStr) as AdminUserDto;
        set({ token, adminUser, isLoggedIn: true });
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
  },
}));

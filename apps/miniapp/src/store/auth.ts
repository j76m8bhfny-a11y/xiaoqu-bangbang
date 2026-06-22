import { create } from 'zustand';
import type { UserDto } from '@xiaoqu-bangbang/shared';
import { getToken, setToken, removeToken, getCachedUser, setCachedUser, removeCachedUser } from '@/utils/storage';

interface AuthState {
  token: string | null;
  user: UserDto | null;
  isLoggedIn: boolean;
  setAuth: (token: string, user: UserDto) => void;
  updateUser: (user: Partial<UserDto>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  user: getCachedUser<UserDto>(),
  isLoggedIn: !!getToken(),

  setAuth: (token, user) => {
    setToken(token);
    setCachedUser(user);
    set({ token, user, isLoggedIn: true });
  },

  updateUser: (partial) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...partial };
      setCachedUser(updated);
      return { user: updated };
    });
  },

  logout: () => {
    removeToken();
    removeCachedUser();
    set({ token: null, user: null, isLoggedIn: false });
  },
}));

import { create } from 'zustand';

import type { User } from '@/service/api/auth';
import {
  getProfile,
  UserSchema,
  logout as logoutRequest,
} from '@/service/api/auth';
import { removeToken } from '@/utils/auth';

type AuthState = {
  loading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  loading: false,
  isAuthenticated: false,
  user: null,
  refreshUser: async () => {
    set({ loading: true });
    try {
      const user = await getProfile();
      const res = UserSchema.safeParse(user);
      if (!res.success) {
        set({ user: null, isAuthenticated: false });
        return;
      }
      set({ user: res.data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      removeToken();
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },
}));

import { create } from 'zustand';
import type { User, Role } from '../types';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  isAdmin: () => boolean;
  isStaffOrAdmin: () => boolean;
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('mobilecommerce_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  accessToken: localStorage.getItem('mobilecommerce_access_token'),
  refreshToken: localStorage.getItem('mobilecommerce_refresh_token'),
  isLoading: false,
  error: null,

  setAuth: (user: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem('mobilecommerce_user', JSON.stringify(user));
    localStorage.setItem('mobilecommerce_access_token', accessToken);
    localStorage.setItem('mobilecommerce_refresh_token', refreshToken);
    set({ user, accessToken, refreshToken, error: null });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login({ email, password });
      const user = res.user;
      const accessToken = res.accessToken;
      const refreshToken = res.refreshToken;

      get().setAuth(user, accessToken, refreshToken);
      set({ isLoading: false });
      return user;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đăng nhập thất bại';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.register(data);
      const user = res.user;
      const accessToken = res.accessToken;
      const refreshToken = res.refreshToken;

      get().setAuth(user, accessToken, refreshToken);
      set({ isLoading: false });
      return user;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đăng ký thất bại';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Ignored
    } finally {
      localStorage.removeItem('mobilecommerce_user');
      localStorage.removeItem('mobilecommerce_access_token');
      localStorage.removeItem('mobilecommerce_refresh_token');
      set({ user: null, accessToken: null, refreshToken: null });
    }
  },

  fetchProfile: async () => {
    try {
      const user = await authService.getProfile();
      localStorage.setItem('mobilecommerce_user', JSON.stringify(user));
      set({ user });
    } catch {
      // If fetching profile fails (e.g., token expired), keep state or clear
    }
  },

  isAdmin: () => {
    const user = get().user;
    return user?.role === 'ADMIN';
  },

  isStaffOrAdmin: () => {
    const user = get().user;
    const role = user?.role as Role | undefined;
    return role === 'ADMIN' || role === 'STAFF' || role === 'MANAGER';
  },
}));

// Listen to automatic token refresh expiration
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
  });
}

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
  loginWithGoogle: (code: string, state?: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  isAdmin: () => boolean;
  isStaffOrAdmin: () => boolean;
}

const normalizeUser = (u: any): User | null => {
  if (!u) return null;
  const rolesArray: string[] = Array.isArray(u.roles)
    ? u.roles.map((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name || ''))
    : u.role
    ? [u.role]
    : [];

  const primaryRole: Role = rolesArray.includes('ADMIN')
    ? 'ADMIN'
    : rolesArray.includes('MANAGER')
    ? 'MANAGER'
    : rolesArray.includes('STAFF')
    ? 'STAFF'
    : (rolesArray[0] as Role) || 'USER';

  const fullName = u.fullName || [u.lastName, u.firstName].filter(Boolean).join(' ') || u.email;
  const avatar = u.avatar || u.avatarUrl || null;

  return {
    ...u,
    role: u.role || primaryRole,
    roles: rolesArray,
    fullName,
    avatar,
    avatarUrl: avatar,
  };
};

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('mobilecommerce_user');
    return raw ? normalizeUser(JSON.parse(raw)) : null;
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
    const normalized = normalizeUser(user) || user;
    localStorage.setItem('mobilecommerce_user', JSON.stringify(normalized));
    localStorage.setItem('mobilecommerce_access_token', accessToken);
    localStorage.setItem('mobilecommerce_refresh_token', refreshToken);
    set({ user: normalized, accessToken, refreshToken, error: null });
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

  loginWithGoogle: async (code: string, state?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.googleLogin(code, state);
      const user = res.user;
      const accessToken = res.accessToken;
      const refreshToken = res.refreshToken;

      get().setAuth(user, accessToken, refreshToken);
      set({ isLoading: false });
      return user;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đăng nhập Google thất bại';
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

  updateUser: (partial: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated = normalizeUser({ ...current, ...partial });
    if (updated) {
      localStorage.setItem('mobilecommerce_user', JSON.stringify(updated));
      set({ user: updated });
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
      const profile = await authService.getProfile();
      const normalizedUser = normalizeUser(profile);
      if (normalizedUser) {
        localStorage.setItem('mobilecommerce_user', JSON.stringify(normalizedUser));
        set({ user: normalizedUser });
      }
    } catch {
      // If fetching profile fails (e.g., token expired), keep state or clear
    }
  },

  isAdmin: () => {
    const user = get().user;
    if (!user) return false;
    const r = (user as any).role;
    const roles: string[] = (user as any).roles || [];
    return r === 'ADMIN' || roles.includes('ADMIN');
  },

  isStaffOrAdmin: () => {
    const user = get().user;
    if (!user) return false;
    const r = (user as any).role;
    const roles: string[] = (user as any).roles || [];
    const checkRoles = ['ADMIN', 'STAFF', 'MANAGER'];
    return checkRoles.includes(r) || roles.some((x: string) => checkRoles.includes(x));
  },
}));

// Listen to automatic token refresh expiration
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
  });
}

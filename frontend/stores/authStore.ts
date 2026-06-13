import { create } from 'zustand';
import { authApi } from '@/lib/api/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  mobile?: string;
  is_active: boolean;
  module_access: { module: string; access_type: string }[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasModuleAccess: (module: string, requiredAccess?: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    set({ user: response.data.data, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue with local logout even if API fails
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const response = await authApi.me();
      set({ user: response.data.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  hasModuleAccess: (module: string, requiredAccess: string = 'VIEW') => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'ADMIN' || user.role === 'OWNER') return true;

    const access = user.module_access?.find((a) => a.module === module);
    if (!access) return false;
    if (access.access_type === 'NONE') return false;
    if (requiredAccess === 'FULL' && access.access_type === 'VIEW') return false;
    return true;
  },
}));

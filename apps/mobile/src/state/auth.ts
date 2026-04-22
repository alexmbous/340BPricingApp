import type { AuthUserSummary, LoginRequest } from '@apexcare/shared-types';
import { create } from 'zustand';


import { api, setUnauthorizedHandler, tokenStore } from '../lib/api-client';

interface AuthState {
  user: AuthUserSummary | null;
  status: 'unknown' | 'unauthenticated' | 'authenticated';
  error: string | null;
  hydrate: () => Promise<void>;
  signIn: (req: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'unknown',
  error: null,

  hydrate: async (): Promise<void> => {
    const refresh = await tokenStore.getRefresh();
    if (!refresh) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    try {
      const user = await api.me();
      set({ status: 'authenticated', user, error: null });
    } catch {
      await tokenStore.clear();
      set({ status: 'unauthenticated', user: null });
    }
  },

  signIn: async (req: LoginRequest): Promise<void> => {
    try {
      const res = await api.login(req);
      set({ status: 'authenticated', user: res.user, error: null });
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  signOut: async (): Promise<void> => {
    await api.logout();
    set({ status: 'unauthenticated', user: null });
  },
}));

// Wire the api-client's 401 handler to our auth store exactly once.
setUnauthorizedHandler(async () => {
  await tokenStore.clear();
  useAuthStore.setState({ status: 'unauthenticated', user: null });
});

export function isAdmin(user: AuthUserSummary | null): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'PARENT_ADMIN' || user.role === 'ORG_ADMIN';
}

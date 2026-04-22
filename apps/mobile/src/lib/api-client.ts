import Constants from 'expo-constants';

import { ApiClient } from '@apexcare/api-client';

import { createSecureTokenStore } from './token-store';

const apiBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:4000';

export const tokenStore = createSecureTokenStore();

// Single app-wide client. onUnauthorized is wired to the auth store by
// src/state/auth.ts on app boot.
let unauthorizedHandler: (() => void | Promise<void>) | undefined;
export function setUnauthorizedHandler(fn: () => void | Promise<void>): void {
  unauthorizedHandler = fn;
}

export const api = new ApiClient({
  baseUrl: apiBaseUrl,
  tokenStore,
  onUnauthorized: async () => {
    if (unauthorizedHandler) await unauthorizedHandler();
  },
});

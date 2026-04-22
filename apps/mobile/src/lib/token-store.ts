import type { AuthTokenPair, TokenStore } from '@apexcare/api-client';
import * as SecureStore from 'expo-secure-store';


const ACCESS_KEY = 'apexcare.access';
const REFRESH_KEY = 'apexcare.refresh';
const ACCESS_EXP_KEY = 'apexcare.accessExp';
const REFRESH_EXP_KEY = 'apexcare.refreshExp';

/**
 * SecureStore-backed token store. On iOS/Android this uses the platform
 * keystore; on web (dev) it falls back to localStorage.
 */
export function createSecureTokenStore(): TokenStore {
  return {
    async getAccess(): Promise<string | null> {
      return SecureStore.getItemAsync(ACCESS_KEY);
    },
    async getRefresh(): Promise<string | null> {
      return SecureStore.getItemAsync(REFRESH_KEY);
    },
    async set(tokens: AuthTokenPair): Promise<void> {
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
        SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
        SecureStore.setItemAsync(ACCESS_EXP_KEY, tokens.accessTokenExpiresAt),
        SecureStore.setItemAsync(REFRESH_EXP_KEY, tokens.refreshTokenExpiresAt),
      ]);
    },
    async clear(): Promise<void> {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_KEY),
        SecureStore.deleteItemAsync(REFRESH_KEY),
        SecureStore.deleteItemAsync(ACCESS_EXP_KEY),
        SecureStore.deleteItemAsync(REFRESH_EXP_KEY),
      ]);
    },
  };
}

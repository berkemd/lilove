import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

let cachedToken: string | null = null;
let tokenListeners: Array<(token: string | null) => void> = [];

export const tokenManager = {
  async getToken(): Promise<string | null> {
    try {
      // Always read from SecureStore to avoid any caching issues across modules
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      console.log('[TokenManager] getToken - token exists:', !!token, 'length:', token?.length || 0);
      if (token) {
        cachedToken = token; // Update cache for getCachedToken()
      }
      return token;
    } catch (error) {
      console.error('[TokenManager] Error getting token:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      cachedToken = token;
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      console.log('[TokenManager] Token saved, length:', token.length);
      tokenListeners.forEach(listener => listener(token));
    } catch (error) {
      console.error('[TokenManager] Error saving token:', error);
      throw error;
    }
  },

  async clearToken(): Promise<void> {
    try {
      cachedToken = null;
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      console.log('[TokenManager] Token cleared');
      tokenListeners.forEach(listener => listener(null));
    } catch (error) {
      console.error('[TokenManager] Error clearing token:', error);
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('[TokenManager] Error saving refresh token:', error);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[TokenManager] Error getting refresh token:', error);
      return null;
    }
  },

  getCachedToken(): string | null {
    return cachedToken;
  },

  onTokenChange(listener: (token: string | null) => void): () => void {
    tokenListeners.push(listener);
    return () => {
      tokenListeners = tokenListeners.filter(l => l !== listener);
    };
  },

  async initialize(): Promise<void> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    cachedToken = token;
    console.log('[TokenManager] Initialized, hasToken:', !!token);
  }
};

export default tokenManager;

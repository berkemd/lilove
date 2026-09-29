import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

let cachedToken: string | null = null;
let cachedRefreshToken: string | null = null;
let tokenLoaded = false;
let refreshLoaded = false;
let tokenRevision = 0;
let refreshRevision = 0;
let persistence: Promise<void> = Promise.resolve();
const tokenListeners = new Set<(token: string | null) => void>();

function notifyToken(token: string | null) {
  const revision = tokenRevision;
  for (const listener of [...tokenListeners]) {
    if (revision !== tokenRevision) return;
    try {
      listener(token);
    } catch {
      console.warn('[TokenManager] Token subscriber failed');
    }
  }
}

// Keep disk mutations in intent order: an older write must finish before logout
// removes it. Memory changes immediately, even if the keychain is unavailable.
function persist(operation: () => Promise<void>): Promise<void> {
  const next = persistence.then(operation).catch(() => {
    console.warn('[TokenManager] Keychain unavailable; using current in-memory session');
  });
  persistence = next;
  return next;
}

export const tokenManager = {
  async getToken(): Promise<string | null> {
    if (tokenLoaded) return cachedToken;
    const revision = tokenRevision;
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!tokenLoaded && revision === tokenRevision) {
        cachedToken = token;
        tokenLoaded = true;
      }
    } catch {
      console.warn('[TokenManager] Could not read keychain');
    }
    return cachedToken;
  },

  async setToken(token: string): Promise<void> {
    cachedToken = token;
    tokenLoaded = true;
    tokenRevision++;
    const saving = persist(() => SecureStore.setItemAsync(TOKEN_KEY, token));
    notifyToken(token);
    await saving;
  },

  async clearToken(): Promise<void> {
    cachedToken = null;
    cachedRefreshToken = null;
    tokenLoaded = true;
    refreshLoaded = true;
    tokenRevision++;
    refreshRevision++;
    const clearing = persist(async () => {
      const results = await Promise.allSettled([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
      if (results.some((result) => result.status === 'rejected')) {
        throw new Error('Keychain deletion failed');
      }
    });
    notifyToken(null);
    await clearing;
  },

  async setRefreshToken(token: string): Promise<void> {
    cachedRefreshToken = token;
    refreshLoaded = true;
    refreshRevision++;
    await persist(() => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token));
  },

  async getRefreshToken(): Promise<string | null> {
    if (refreshLoaded) return cachedRefreshToken;
    const revision = refreshRevision;
    try {
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshLoaded && revision === refreshRevision) {
        cachedRefreshToken = token;
        refreshLoaded = true;
      }
    } catch {
      console.warn('[TokenManager] Could not read refresh credential');
    }
    return cachedRefreshToken;
  },

  getCachedToken(): string | null {
    return cachedToken;
  },

  onTokenChange(listener: (token: string | null) => void): () => void {
    tokenListeners.add(listener);
    return () => {
      tokenListeners.delete(listener);
    };
  },

  async initialize(): Promise<void> {
    await this.getToken();
  },
};

export default tokenManager;

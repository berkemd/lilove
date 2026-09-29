import Constants from 'expo-constants';
import { tokenManager } from '../services/tokenManager';
import type { SubscriptionStatus } from './subscription';
import { DEMO_TOKEN, demoCevap, demoDisi } from './demoData';
import { t } from '../i18n';
import { createHabitsApi } from './habits';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://lilove.org';
const PROFILE_PICTURE_PATH = /^\/uploads\/profile-pictures\/[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g)$/;
const API_ORIGIN = API_BASE_URL.match(/^https?:\/\/[^/?#]+/)?.[0];

export function resolveProfilePhotoUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (PROFILE_PICTURE_PATH.test(value)) return API_ORIGIN ? `${API_ORIGIN}${value}` : undefined;
  // Preserve provider URLs without depending on native URL getter support.
  if (
    /[\s\\]/.test(value) ||
    [...value].some((character) => character < ' ' || character === '\u007f')
  ) {
    return undefined;
  }
  return /^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:[/?#].*)?$/.test(value) ? value : undefined;
}

interface ProfilePhotoAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string;
}

interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
  outcomeUnknown?: boolean;
}

class ApiClient {
  private baseURL: string;
  private maxRetries: number;
  private retryDelay: number;
  private timeout: number;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.timeout = 30000;
    console.log('[API Client] Initialized with baseURL:', this.baseURL);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private normalizeError(error: any, fetchFailed = false): ApiError {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || 'Request failed',
        code: error.response.data?.code,
        details: error.response.data,
      };
    }

    if (error.request || (fetchFailed && error.name === 'TypeError')) {
      return {
        status: 0,
        message: t('network_error_no_response_received'),
        code: 'NETWORK_ERROR',
      };
    }

    return {
      status: -1,
      message: error.message || 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  private shouldRetry(error: ApiError, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) return false;

    if (error.status >= 400 && error.status < 500 && error.status !== 408) {
      return false;
    }

    return error.status === 0 || error.status >= 500 || error.status === 408;
  }

  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      timeout?: number;
      authorizationToken?: string;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    // DEMO KİPİ TEK NOKTADAN KESİLİYOR.
    //
    // Yirmi ekranın hepsi zaten bu istemciden geçiyor; kesişi burada
    // yapmak, ekranlara tek satır dokunmadan hesapsız bir tur
    // açıyor. Ekranlarda `if (demo)` dallanması olsaydı, yeni yazılan
    // her ekran o dalı unutur ve demo sessizce kırılırdı.
    const jeton = options?.authorizationToken ?? (await tokenManager.getToken());
    if (jeton === DEMO_TOKEN) {
      const kapali = demoDisi(endpoint);
      if (kapali) {
        // SESSİZCE BOŞ DÖNMÜYORUZ. Boş dönmek, ekranın "verin yok"
        // diye yalan söylemesi olurdu; kullanıcı neden çalışmadığını
        // öğreniyor.
        throw { status: 403, message: kapali, code: 'DEMO_MODE' };
      }
      const cevap = demoCevap(method, endpoint, data);
      if (cevap !== undefined) return cevap as T;
      throw {
        status: 501,
        message: t('not_available_in_demo_mode'),
        code: 'DEMO_MODE',
      };
    }

    const url = `${this.baseURL}${endpoint}`;
    method = method.toUpperCase();
    // A lost response does not mean the server rolled back a write. Until
    // endpoints support idempotency keys, only read methods may be replayed.
    const safeToRetry = method === 'GET' || method === 'HEAD';
    const maxRetries = safeToRetry ? (options?.maxRetries ?? this.maxRetries) : 0;
    const retryDelay = options?.retryDelay ?? this.retryDelay;
    const timeout = options?.timeout ?? this.timeout;

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      let requestStarted = false;
      let responseStarted = false;
      try {
        const multipart = typeof FormData !== 'undefined' && data instanceof FormData;
        const headers: Record<string, string> = { ...options?.headers };
        if (multipart) {
          // Native fetch owns the multipart boundary.
          for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === 'content-type') delete headers[key];
          }
        } else {
          headers['Content-Type'] ??= 'application/json';
        }

        // Pin the initial account for this operation, including read retries.
        if (jeton) {
          headers['Authorization'] = `Bearer ${jeton}`;
        }

        const body = multipart ? data : data ? JSON.stringify(data) : undefined;
        requestStarted = true;
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });
        responseStarted = true;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw {
            status: response.status,
            message: errorData.message || `HTTP ${response.status}`,
            code: errorData.code || errorData.error,
            details: errorData,
          };
        }
        if (method === 'HEAD') return undefined as T;
        return await response.json();
      } catch (error: any) {
        if (error.name === 'AbortError') {
          lastError = {
            status: 408,
            message: t('request_timeout'),
            code: 'TIMEOUT',
          };
        } else if (typeof error.status === 'number') {
          lastError = error as ApiError;
        } else {
          lastError = this.normalizeError(error, requestStarted && !responseStarted);
        }

        if (
          !safeToRetry &&
          requestStarted &&
          (lastError.status === 0 ||
            lastError.status === 408 ||
            lastError.status >= 500 ||
            (responseStarted && lastError.status === -1))
        ) {
          lastError = { ...lastError, outcomeUnknown: true, message: t('request_outcome_unknown') };
        }

        if (!this.shouldRetry(lastError, attempt, maxRetries)) {
          throw lastError;
        }
      } finally {
        // Keep the deadline through body consumption; clean it up on every exit.
        clearTimeout(timeoutId);
      }

      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await this.sleep(Math.min(delay, 30000));
      }
    }

    throw lastError || new Error(t('max_retries_exceeded'));
  }

  async get<T>(endpoint: string, options?: any): Promise<T> {
    return this.request<T>('GET', endpoint, null, options);
  }

  async post<T>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async patch<T>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: any): Promise<T> {
    return this.request<T>('DELETE', endpoint, null, options);
  }

  async login(
    email: string,
    password: string
  ): Promise<{
    accessToken: string;
    token?: string;
    refreshToken?: string;
    user: any;
  }> {
    const response = await this.post<{
      accessToken: string;
      token?: string;
      refreshToken?: string;
      user: any;
    }>('/api/auth/login', {
      email,
      password,
    });

    const authToken = response.accessToken || response.token;
    if (authToken) {
      await tokenManager.setToken(authToken);
    }

    if (response.refreshToken) {
      await tokenManager.setRefreshToken(response.refreshToken);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout');
    } finally {
      await tokenManager.clearToken();
    }
  }

  async refreshToken(): Promise<{
    accessToken: string;
    token?: string;
    refreshToken?: string;
  }> {
    const storedRefreshToken = await tokenManager.getRefreshToken();

    const response = await this.post<{
      accessToken: string;
      token?: string;
      refreshToken?: string;
    }>('/api/auth/refresh', {
      refreshToken: storedRefreshToken,
    });

    const authToken = response.accessToken || response.token;
    if (authToken) {
      await tokenManager.setToken(authToken);
    }

    if (response.refreshToken) {
      await tokenManager.setRefreshToken(response.refreshToken);
    }

    return response;
  }
}

export const apiClient = new ApiClient();

export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),

  login: apiClient.login.bind(apiClient),
  logout: apiClient.logout.bind(apiClient),
  refreshToken: apiClient.refreshToken.bind(apiClient),
  register: async (data: any) => {
    const response = await apiClient.post<any>('/api/auth/register', data);
    const authToken = response.accessToken || response.token;
    if (authToken) {
      await tokenManager.setToken(authToken);
    }
    if (response.refreshToken) {
      await tokenManager.setRefreshToken(response.refreshToken);
    }
    return response;
  },
  getCurrentUser: async () => apiClient.get('/api/user'),
  appleSignIn: async (data: any) => {
    const response = await apiClient.post<any>('/api/auth/apple', data);
    const authToken = response.accessToken || response.token;
    if (authToken) {
      await tokenManager.setToken(authToken);
    }
    if (response.refreshToken) {
      await tokenManager.setRefreshToken(response.refreshToken);
    }
    return response;
  },
  googleSignIn: async (data: any) => {
    const response = await apiClient.post<any>('/api/auth/google/mobile', data);
    const authToken = response.accessToken || response.token;
    if (authToken) {
      await tokenManager.setToken(authToken);
    }
    if (response.refreshToken) {
      await tokenManager.setRefreshToken(response.refreshToken);
    }
    return response;
  },

  getGoals: async () => apiClient.get('/api/goals'),
  createGoal: async (goalData: any) => apiClient.post('/api/goals', goalData),
  updateGoal: async (id: string, goalData: any) => apiClient.patch(`/api/goals/${id}`, goalData),
  deleteGoal: async (id: string) => apiClient.delete(`/api/goals/${id}`),

  getTasks: async () => apiClient.get('/api/tasks'),
  getCompletedTasks: async () => apiClient.get('/api/tasks?status=completed&limit=1'),
  createTask: async (taskData: any) => apiClient.post('/api/tasks', taskData),
  updateTask: async (id: string, taskData: any) => apiClient.patch(`/api/tasks/${id}`, taskData),
  completeTask: async (id: string, authorizationToken?: string) =>
    apiClient.post(`/api/tasks/${id}/complete`, undefined, { authorizationToken }),
  getProgressOverview: async (
    timeZone: string,
    goalId: string | null,
    authorizationToken?: string
  ) =>
    apiClient.get(
      `/api/progress/overview?timeZone=${encodeURIComponent(timeZone)}${goalId ? `&goalId=${encodeURIComponent(goalId)}` : ''}`,
      { authorizationToken }
    ),

  ...createHabitsApi(apiClient),

  getCoachCapabilities: async (): Promise<{ available: boolean; code?: string }> =>
    apiClient.get('/api/ai/capabilities', { maxRetries: 0 }),
  getCoachResponse: async (
    message: string
  ): Promise<{ response?: string; message?: string; suggestions?: string[] }> =>
    apiClient.post('/api/ai-coach/chat', { message }, { maxRetries: 0 }),
  getDailyInsight: async (): Promise<{
    insight?: string;
    motivation?: string;
    focusArea?: string;
    challenge?: string;
  }> => apiClient.get('/api/ai-coach/daily-insight', { maxRetries: 0 }),
  getPerformanceAnalysis: async () => apiClient.get('/api/ai-coach/performance-analysis'),
  getCoachRecommendations: async () => apiClient.get('/api/ai-coach/recommendations'),

  updateProfile: async (profileData: any) => apiClient.patch('/api/user/profile', profileData),
  uploadProfilePicture: async (
    asset: ProfilePhotoAsset,
    authorizationToken: string
  ): Promise<{ profileImageUrl: string }> => {
    const uriName = asset.uri.split(/[?#]/)[0].split('/').pop() || '';
    const extension = uriName.includes('.') ? uriName.split('.').pop()?.toLowerCase() : undefined;
    const fallbackExtension = (asset.fileName?.split('.').pop() || '').toLowerCase();
    const inferred = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const type =
      asset.mimeType?.toLowerCase() ||
      inferred[(extension || fallbackExtension) as keyof typeof inferred];
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const outputExtension = extensions[type as keyof typeof extensions];
    if (!outputExtension) {
      throw {
        status: 0,
        code: 'UNSUPPORTED_PHOTO_FORMAT',
        message: t('profile_photo_format_unsupported'),
      };
    }
    const formData = new FormData();
    formData.append('picture', {
      uri: asset.uri,
      name: `profile.${outputExtension}`,
      type,
    } as any);
    const response = await apiClient.post<{ picture?: { filePath?: string } }>(
      '/api/profile/picture',
      formData,
      { authorizationToken, maxRetries: 0 }
    );
    const filePath = response?.picture?.filePath;
    if (typeof filePath !== 'string' || !PROFILE_PICTURE_PATH.test(filePath) || !API_ORIGIN) {
      throw {
        status: 0,
        code: 'INVALID_PHOTO_RESPONSE',
        outcomeUnknown: true,
        message: t('request_outcome_unknown'),
      };
    }
    return { profileImageUrl: `${API_ORIGIN}${filePath}` };
  },

  getAnalytics: async (
    timeframe: string = '7d'
  ): Promise<{
    currentStreak?: number;
    totalGoals?: number;
    completedTasks?: number;
  }> => apiClient.get(`/api/analytics?timeframe=${timeframe}`),

  getAchievements: async () => apiClient.get('/api/achievements'),

  getLeaderboard: async (category: string = 'overall') =>
    apiClient.get(`/api/leaderboard?category=${category}`),

  updatePushToken: async (token: string) => apiClient.post('/api/user/push-token', { token }),

  // STOREKIT 2'DE MAKBUZ YOK, İMZALI İŞLEM VAR.
  //
  // Burada `{ receipt }` gönderiliyordu; sunucudaki `verifyReceipt` ise
  // işlem kimliği olmadan HER ÇAĞRIDA fırlatıyor
  // ("Transaction ID required for App Store Server API"). Yani doğrulama
  // uçtan uca hiç çalışmamıştı. Gönderilen tek şey artık Apple'ın işlem
  // kimliği; jeton miktarını ve abonelik katmanını sunucu Apple'a
  // sorarak belirliyor — istemcinin söylediğine değil.
  getIapAccountToken: async (productId: string) =>
    apiClient.post<{ appAccountToken: string }>('/api/iap/account-token', { productId }),
  verifyPurchase: async (transactionId: string, authorizationToken?: string) =>
    apiClient.post<{ success: boolean }>(
      '/api/subscription/verify',
      { transactionId },
      { authorizationToken }
    ),
  // DÖNÜŞ TİPLERİ YAZILI: `apiClient.get` tür değişkenli ve tür
  // verilmezse `{}` dönüyor — yani `d.balance` derleme anında hata
  // veriyor. Bu dosyada başka hiçbir çağrı tür vermemiş; verenler
  // yalnız bunlar, çünkü sonuçlarını gerçekten OKUYORUZ.
  getSubscriptionStatus: async (authorizationToken?: string) =>
    apiClient.get<SubscriptionStatus>('/api/subscription/status', { authorizationToken }),
  cancelSubscription: async () => apiClient.post('/api/subscription/cancel'),
  getCoinBalance: async (authorizationToken?: string) =>
    apiClient.get<{ balance: number }>('/api/coin-balance', { authorizationToken }),

  getAvatarZones: async () => apiClient.get('/api/avatar-system/zones'),
  getTraitsByZone: async (zoneId: string) =>
    apiClient.get(`/api/avatar-system/zones/${zoneId}/traits`),
  getMyTraits: async () => apiClient.get('/api/avatar-system/my-traits'),
  getMyEquipped: async () => apiClient.get('/api/avatar-system/my-equipped'),
  equipTrait: async (zoneId: string, traitId: string) =>
    apiClient.post('/api/avatar-system/equip', { zoneId, traitId }),
  unlockTrait: async (traitId: string) => apiClient.post(`/api/avatar-system/unlock/${traitId}`),
  unequipTrait: async (zoneId: string) => apiClient.delete(`/api/avatar-system/unequip/${zoneId}`),
  getAvatar: async () => apiClient.get('/api/avatar'),
  getEnvironment: async () => apiClient.get('/api/environment'),
  getUserStats: async () => apiClient.get('/api/user/stats'),
};

export default api;

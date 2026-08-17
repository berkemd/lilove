import Constants from 'expo-constants';
import { tokenManager } from '../services/tokenManager';
import { DEMO_TOKEN, demoCevap, demoDisi } from './demoData';

interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

class ApiClient {
  private baseURL: string;
  private maxRetries: number;
  private retryDelay: number;
  private timeout: number;

  constructor() {
    this.baseURL = Constants.expoConfig?.extra?.apiUrl || 
                   process.env.EXPO_PUBLIC_API_URL || 
                   'https://lilove.org';
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.timeout = 30000;
    console.log('[API Client] Initialized with baseURL:', this.baseURL);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private normalizeError(error: any): ApiError {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || 'Request failed',
        code: error.response.data?.code,
        details: error.response.data,
      };
    }
    
    if (error.request) {
      return {
        status: 0,
        message: 'Network error - no response received',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      status: -1,
      message: error.message || 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  private shouldRetry(error: ApiError, attempt: number): boolean {
    if (attempt >= this.maxRetries) return false;
    
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
    }
  ): Promise<T> {
    // DEMO KİPİ TEK NOKTADAN KESİLİYOR.
    //
    // Yirmi ekranın hepsi zaten bu istemciden geçiyor; kesişi burada
    // yapmak, ekranlara tek satır dokunmadan hesapsız bir tur
    // açıyor. Ekranlarda `if (demo)` dallanması olsaydı, yeni yazılan
    // her ekran o dalı unutur ve demo sessizce kırılırdı.
    const jeton = await tokenManager.getToken();
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
      throw { status: 501, message: 'Not available in demo mode.', code: 'DEMO_MODE' };
    }

    const url = `${this.baseURL}${endpoint}`;
    const maxRetries = options?.maxRetries ?? this.maxRetries;
    const retryDelay = options?.retryDelay ?? this.retryDelay;
    const timeout = options?.timeout ?? this.timeout;

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log('[API Client] Getting token for request to:', endpoint);
        const token = await tokenManager.getToken();
        console.log('[API Client] Token retrieved:', token ? `${token.substring(0, 20)}...` : 'NULL');
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('[API Client] Authorization header SET for:', endpoint);
        } else {
          console.log('[API Client] NO TOKEN - Authorization header NOT set for:', endpoint);
        }

        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = {
            status: response.status,
            message: errorData.message || `HTTP ${response.status}`,
            code: errorData.code,
            details: errorData,
          };

          if (!this.shouldRetry(lastError, attempt)) {
            throw lastError;
          }
        } else {
          const responseData = await response.json();
          return responseData;
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          lastError = {
            status: 408,
            message: 'Request timeout',
            code: 'TIMEOUT',
          };
        } else if (error.status) {
          lastError = error;
        } else {
          lastError = this.normalizeError(error);
        }

        if (lastError && !this.shouldRetry(lastError, attempt)) {
          throw lastError;
        }
      }

      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await this.sleep(Math.min(delay, 30000));
      }
    }

    throw lastError || new Error('Max retries exceeded');
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

  async login(email: string, password: string): Promise<{ accessToken: string; token?: string; refreshToken?: string; user: any }> {
    const response = await this.post<{ accessToken: string; token?: string; refreshToken?: string; user: any }>('/api/auth/login', {
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

  async refreshToken(): Promise<{ accessToken: string; token?: string; refreshToken?: string }> {
    const storedRefreshToken = await tokenManager.getRefreshToken();
    
    const response = await this.post<{ accessToken: string; token?: string; refreshToken?: string }>('/api/auth/refresh', {
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
  createTask: async (taskData: any) => apiClient.post('/api/tasks', taskData),
  updateTask: async (id: string, taskData: any) => apiClient.patch(`/api/tasks/${id}`, taskData),
  completeTask: async (id: string) => apiClient.post(`/api/tasks/${id}/complete`),
  
  getHabits: async () => apiClient.get('/api/habits'),
  createHabit: async (habitData: any) => apiClient.post('/api/habits', habitData),
  trackHabit: async (id: string) => apiClient.post(`/api/habits/${id}/track`),
  
  getCoachResponse: async (message: string): Promise<{ response?: string; message?: string; suggestions?: string[] }> => 
    apiClient.post('/api/ai-coach/chat', { message }),
  getDailyInsight: async (): Promise<{ insight?: string; motivation?: string; focusArea?: string; challenge?: string }> => 
    apiClient.get('/api/ai-coach/daily-insight'),
  getPerformanceAnalysis: async () => apiClient.get('/api/ai-coach/performance-analysis'),
  getCoachRecommendations: async () => apiClient.get('/api/ai-coach/recommendations'),
  
  updateProfile: async (profileData: any) => apiClient.patch('/api/user/profile', profileData),
  uploadProfilePicture: async (uri: string): Promise<{ profileImageUrl: string }> => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename!);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('profilePicture', {
      uri,
      name: filename,
      type,
    } as any);
    
    return apiClient.post('/api/user/profile-picture', formData);
  },
  
  getAnalytics: async (timeframe: string = '7d'): Promise<{ currentStreak?: number; totalGoals?: number; completedTasks?: number }> => 
    apiClient.get(`/api/analytics?timeframe=${timeframe}`),
  
  getAchievements: async () => apiClient.get('/api/achievements'),
  
  getLeaderboard: async (category: string = 'overall') => apiClient.get(`/api/leaderboard?category=${category}`),
  
  updatePushToken: async (token: string) => apiClient.post('/api/user/push-token', { token }),
  
  // STOREKIT 2'DE MAKBUZ YOK, İMZALI İŞLEM VAR.
  //
  // Burada `{ receipt }` gönderiliyordu; sunucudaki `verifyReceipt` ise
  // işlem kimliği olmadan HER ÇAĞRIDA fırlatıyor
  // ("Transaction ID required for App Store Server API"). Yani doğrulama
  // uçtan uca hiç çalışmamıştı. Gönderilen tek şey artık Apple'ın işlem
  // kimliği; jeton miktarını ve abonelik katmanını sunucu Apple'a
  // sorarak belirliyor — istemcinin söylediğine değil.
  verifyPurchase: async (transactionId: string) =>
    apiClient.post<{ success?: boolean }>('/api/subscription/verify', { transactionId }),
  // DÖNÜŞ TİPLERİ YAZILI: `apiClient.get` tür değişkenli ve tür
  // verilmezse `{}` dönüyor — yani `d.balance` derleme anında hata
  // veriyor. Bu dosyada başka hiçbir çağrı tür vermemiş; verenler
  // yalnız bunlar, çünkü sonuçlarını gerçekten OKUYORUZ.
  getSubscriptionStatus: async () =>
    apiClient.get<{
      subscriptionTier?: string;
      subscriptionStatus?: string;
      isPremium?: boolean;
    }>('/api/subscription/status'),
  cancelSubscription: async () => apiClient.post('/api/subscription/cancel'),
  getCoinBalance: async () => apiClient.get<{ balance: number }>('/api/coin-balance'),
  
  getAvatarZones: async () => apiClient.get('/api/avatar-system/zones'),
  getTraitsByZone: async (zoneId: string) => apiClient.get(`/api/avatar-system/zones/${zoneId}/traits`),
  getMyTraits: async () => apiClient.get('/api/avatar-system/my-traits'),
  getMyEquipped: async () => apiClient.get('/api/avatar-system/my-equipped'),
  equipTrait: async (zoneId: string, traitId: string) => apiClient.post('/api/avatar-system/equip', { zoneId, traitId }),
  unlockTrait: async (traitId: string) => apiClient.post(`/api/avatar-system/unlock/${traitId}`),
  unequipTrait: async (zoneId: string) => apiClient.delete(`/api/avatar-system/unequip/${zoneId}`),
  getAvatar: async () => apiClient.get('/api/avatar'),
  getEnvironment: async () => apiClient.get('/api/environment'),
  getUserStats: async () => apiClient.get('/api/user/stats'),
};

export default api;

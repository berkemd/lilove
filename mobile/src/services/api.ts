import axios, { AxiosInstance, AxiosError } from 'axios';
import Constants from 'expo-constants';
import { tokenManager } from './tokenManager';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://lilove.org';
const API_TIMEOUT = Constants.expoConfig?.extra?.apiTimeout || 30000;

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    console.log('[API] Initialized with baseURL:', API_URL);
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        const token = await tokenManager.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[API] Request with token to:', config.url);
        } else {
          console.log('[API] Request without token to:', config.url);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          const url = error.config?.url || '';
          if (!url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/auth/me')) {
            console.log('[API] 401 received on protected route, clearing token');
            await tokenManager.clearToken();
          } else {
            console.log('[API] 401 received on auth route, not clearing token');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async setToken(token: string) {
    await tokenManager.setToken(token);
  }

  async clearToken() {
    await tokenManager.clearToken();
  }

  async checkHealth() {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/api/auth/login', { email, password });
    const token = response.data.accessToken || response.data.token;
    if (token) {
      await tokenManager.setToken(token);
      if (response.data.refreshToken) {
        await tokenManager.setRefreshToken(response.data.refreshToken);
      }
    }
    return response.data;
  }

  async register(data: { email: string; password: string; firstName?: string; lastName?: string }) {
    const response = await this.client.post('/api/auth/register', data);
    const token = response.data.accessToken || response.data.token;
    if (token) {
      await tokenManager.setToken(token);
      if (response.data.refreshToken) {
        await tokenManager.setRefreshToken(response.data.refreshToken);
      }
    }
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      await tokenManager.clearToken();
    }
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  async getGoals() {
    const response = await this.client.get('/api/goals');
    return response.data;
  }

  async createGoal(goalData: any) {
    const response = await this.client.post('/api/goals', goalData);
    return response.data;
  }

  async updateGoal(id: string, goalData: any) {
    const response = await this.client.patch(`/api/goals/${id}`, goalData);
    return response.data;
  }

  async deleteGoal(id: string) {
    const response = await this.client.delete(`/api/goals/${id}`);
    return response.data;
  }

  async getTasks() {
    const response = await this.client.get('/api/tasks');
    return response.data;
  }

  async createTask(taskData: any) {
    const response = await this.client.post('/api/tasks', taskData);
    return response.data;
  }

  async updateTask(id: string, taskData: any) {
    const response = await this.client.patch(`/api/tasks/${id}`, taskData);
    return response.data;
  }

  async completeTask(id: string) {
    const response = await this.client.post(`/api/tasks/${id}/complete`);
    return response.data;
  }

  async getHabits() {
    const response = await this.client.get('/api/habits');
    return response.data;
  }

  async createHabit(habitData: any) {
    const response = await this.client.post('/api/habits', habitData);
    return response.data;
  }

  async trackHabit(id: string) {
    const response = await this.client.post(`/api/habits/${id}/track`);
    return response.data;
  }

  async getCoachResponse(message: string) {
    const response = await this.client.post('/api/ai-coach/chat', { message });
    return response.data;
  }

  async getDailyInsight() {
    const response = await this.client.get('/api/ai-coach/daily-insight');
    return response.data;
  }

  async getPerformanceAnalysis() {
    const response = await this.client.get('/api/ai-coach/performance-analysis');
    return response.data;
  }

  async getCoachRecommendations() {
    const response = await this.client.get('/api/ai-coach/recommendations');
    return response.data;
  }

  async updateProfile(profileData: any) {
    const response = await this.client.patch('/api/user/profile', profileData);
    return response.data;
  }

  async uploadProfilePicture(uri: string) {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename!);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('profilePicture', {
      uri,
      name: filename,
      type,
    } as any);

    const response = await this.client.post('/api/user/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getAnalytics(timeframe: string = '7d') {
    const response = await this.client.get(`/api/analytics?timeframe=${timeframe}`);
    return response.data;
  }

  async getAchievements() {
    const response = await this.client.get('/api/achievements');
    return response.data;
  }

  async getLeaderboard(category: string = 'overall') {
    const response = await this.client.get(`/api/leaderboard?category=${category}`);
    return response.data;
  }

  async appleSignIn(data: {
    identityToken: string | null;
    authorizationCode: string | null;
    user: string;
    email: string | null;
    fullName: any;
  }) {
    const response = await this.client.post('/api/auth/apple', data);
    const token = response.data.accessToken || response.data.token;
    if (token) {
      await tokenManager.setToken(token);
      if (response.data.refreshToken) {
        await tokenManager.setRefreshToken(response.data.refreshToken);
      }
    }
    return response.data;
  }

  async updatePushToken(token: string) {
    const response = await this.client.post('/api/user/push-token', { token });
    return response.data;
  }

  // STOREKIT 2'DE MAKBUZ YOK, İMZALI İŞLEM VAR.
  //
  // Buradan eskiden `{ receipt }` gönderiliyordu ve sunucudaki
  // `verifyReceipt` işlem kimliği olmadan HER ÇAĞRIDA fırlatıyordu
  // ("Transaction ID required for App Store Server API"). Yani doğrulama
  // uçtan uca hiç çalışmamıştı. Gönderilen tek şey artık Apple'ın
  // işlem kimliği; jeton miktarını ve abonelik katmanını sunucu
  // Apple'a sorarak belirliyor.
  async verifyPurchase(transactionId: string) {
    const response = await this.client.post('/api/subscription/verify', { transactionId });
    return response.data;
  }

  async getCoinBalance(): Promise<{ balance: number }> {
    const response = await this.client.get('/api/coin-balance');
    return response.data;
  }

  async getSubscriptionStatus() {
    const response = await this.client.get('/api/subscription/status');
    return response.data;
  }

  async cancelSubscription() {
    const response = await this.client.post('/api/subscription/cancel');
    return response.data;
  }
}

export const api = new ApiService();
export default api;

import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  // Keys for different storage items
  private readonly KEYS = {
    USER_PREFERENCES: '@lilove_user_preferences',
    CACHED_GOALS: '@lilove_cached_goals',
    CACHED_HABITS: '@lilove_cached_habits',
    CACHED_TASKS: '@lilove_cached_tasks',
    OFFLINE_QUEUE: '@lilove_offline_queue',
    LAST_SYNC: '@lilove_last_sync',
    ONBOARDING_COMPLETED: '@lilove_onboarding_completed',
    THEME: '@lilove_theme',
    LANGUAGE: '@lilove_language',
    NOTIFICATIONS_ENABLED: '@lilove_notifications',
  };

  // Generic storage methods
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // User preferences
  async saveUserPreferences(preferences: any): Promise<void> {
    await this.setItem(this.KEYS.USER_PREFERENCES, preferences);
  }

  async getUserPreferences(): Promise<any> {
    return await this.getItem(this.KEYS.USER_PREFERENCES);
  }

  // Caching methods for offline support
  async cacheGoals(goals: any[]): Promise<void> {
    await this.setItem(this.KEYS.CACHED_GOALS, {
      data: goals,
      timestamp: Date.now(),
    });
  }

  async getCachedGoals(): Promise<{ data: any[], timestamp: number } | null> {
    return await this.getItem(this.KEYS.CACHED_GOALS);
  }

  async cacheHabits(habits: any[]): Promise<void> {
    await this.setItem(this.KEYS.CACHED_HABITS, {
      data: habits,
      timestamp: Date.now(),
    });
  }

  async getCachedHabits(): Promise<{ data: any[], timestamp: number } | null> {
    return await this.getItem(this.KEYS.CACHED_HABITS);
  }

  async cacheTasks(tasks: any[]): Promise<void> {
    await this.setItem(this.KEYS.CACHED_TASKS, {
      data: tasks,
      timestamp: Date.now(),
    });
  }

  async getCachedTasks(): Promise<{ data: any[], timestamp: number } | null> {
    return await this.getItem(this.KEYS.CACHED_TASKS);
  }

  // Offline queue for syncing when back online
  async addToOfflineQueue(action: {
    type: string;
    endpoint: string;
    method: string;
    data: any;
    timestamp: number;
  }): Promise<void> {
    const queue = await this.getOfflineQueue();
    queue.push(action);
    await this.setItem(this.KEYS.OFFLINE_QUEUE, queue);
  }

  async getOfflineQueue(): Promise<any[]> {
    const queue = await this.getItem<any[]>(this.KEYS.OFFLINE_QUEUE);
    return queue || [];
  }

  async clearOfflineQueue(): Promise<void> {
    await this.setItem(this.KEYS.OFFLINE_QUEUE, []);
  }

  async removeFromOfflineQueue(index: number): Promise<void> {
    const queue = await this.getOfflineQueue();
    queue.splice(index, 1);
    await this.setItem(this.KEYS.OFFLINE_QUEUE, queue);
  }

  // Sync management
  async setLastSyncTime(timestamp: number): Promise<void> {
    await this.setItem(this.KEYS.LAST_SYNC, timestamp);
  }

  async getLastSyncTime(): Promise<number | null> {
    return await this.getItem(this.KEYS.LAST_SYNC);
  }

  // App settings
  async setOnboardingCompleted(completed: boolean): Promise<void> {
    await this.setItem(this.KEYS.ONBOARDING_COMPLETED, completed);
  }

  async isOnboardingCompleted(): Promise<boolean> {
    const completed = await this.getItem<boolean>(this.KEYS.ONBOARDING_COMPLETED);
    return completed || false;
  }

  async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    await this.setItem(this.KEYS.THEME, theme);
  }

  async getTheme(): Promise<'light' | 'dark' | 'auto'> {
    const theme = await this.getItem<'light' | 'dark' | 'auto'>(this.KEYS.THEME);
    return theme || 'auto';
  }

  async setLanguage(language: string): Promise<void> {
    await this.setItem(this.KEYS.LANGUAGE, language);
  }

  async getLanguage(): Promise<string> {
    const language = await this.getItem<string>(this.KEYS.LANGUAGE);
    return language || 'en';
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await this.setItem(this.KEYS.NOTIFICATIONS_ENABLED, enabled);
  }

  async areNotificationsEnabled(): Promise<boolean> {
    const enabled = await this.getItem<boolean>(this.KEYS.NOTIFICATIONS_ENABLED);
    return enabled !== false; // Default to true
  }

  // Check if data is stale (older than specified minutes)
  isDataStale(timestamp: number, maxAgeMinutes: number = 30): boolean {
    const now = Date.now();
    const age = (now - timestamp) / (1000 * 60); // Convert to minutes
    return age > maxAgeMinutes;
  }
}

export const storage = new StorageService();
export default storage;
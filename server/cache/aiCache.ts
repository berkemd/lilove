import crypto from 'crypto';

interface CacheEntry {
  value: string;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  metadata: {
    userId: string;
    model: string;
    promptHash: string;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
}

class LRUCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttlMs: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    evictions: 0
  };

  constructor(maxSize: number = 100, ttlMs: number = 3600000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  private generateKey(userId: string, prompt: string, model: string, goalId?: string, context?: string): string {
    // Include goalId and context in cache key to prevent stale answers across different goals
    const keyData = `${userId}:${prompt}:${model}:${goalId || 'no-goal'}:${context || 'no-context'}`;
    const hash = crypto
      .createHash('sha256')
      .update(keyData)
      .digest('hex');
    return hash;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.ttlMs;
  }

  private evictLRU(): void {
    if (this.cache.size === 0) return;

    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.stats.evictions++;
        continue;
      }

      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey && this.cache.size >= this.maxSize) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  set(userId: string, prompt: string, model: string, response: string, goalId?: string, context?: string): void {
    const key = this.generateKey(userId, prompt, model, goalId, context);
    const now = Date.now();

    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value: response,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      metadata: {
        userId,
        model,
        promptHash: key
      }
    });

    this.updateStats();
  }

  get(userId: string, prompt: string, model: string, goalId?: string, context?: string): string | null {
    const key = this.generateKey(userId, prompt, model, goalId, context);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.updateStats();
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.cache.set(key, entry);

    this.stats.hits++;
    this.updateStats();

    console.log(`[AI Cache] HIT - User: ${userId.substring(0, 8)}, Model: ${model}, Access: ${entry.accessCount}`);
    return entry.value;
  }

  invalidateUser(userId: string): number {
    let count = 0;
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.metadata.userId === userId) {
        this.cache.delete(key);
        count++;
      }
    }
    this.updateStats();
    console.log(`[AI Cache] Invalidated ${count} entries for user ${userId.substring(0, 8)}`);
    return count;
  }

  invalidateUserGoalContext(userId: string): number {
    return this.invalidateUser(userId);
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      evictions: 0
    };
    console.log('[AI Cache] Cache cleared');
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  getStats(): CacheStats {
    this.cleanExpired();
    return {
      ...this.stats,
      hitRate: Math.round(this.stats.hitRate * 100) / 100
    };
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }
    this.updateStats();
  }

  logStats(): void {
    const stats = this.getStats();
    console.log('[AI Cache Stats]', {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${stats.hitRate.toFixed(2)}%`,
      size: `${stats.size}/${this.maxSize}`,
      evictions: stats.evictions
    });
  }
}

export const aiCache = new LRUCache(100, 3600000);

// Only start periodic logging in non-test environments
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    aiCache.logStats();
  }, 300000);
}

export default aiCache;

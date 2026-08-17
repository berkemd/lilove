import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  queueSize: number;
}

interface UserRateLimit {
  requests: number[];
  queue: Array<{
    resolve: (value: void) => void;
    reject: (reason: any) => void;
    timestamp: number;
  }>;
}

const configs: Record<string, RateLimitConfig> = {
  openai: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    queueSize: 5
  },
  gemini: {
    maxRequests: 15,
    windowMs: 60000, // 1 minute
    queueSize: 5
  }
};

const userLimits = new Map<string, Map<string, UserRateLimit>>();

function getUserLimit(userId: string, provider: string): UserRateLimit {
  if (!userLimits.has(userId)) {
    userLimits.set(userId, new Map());
  }
  
  const providerLimits = userLimits.get(userId)!;
  
  if (!providerLimits.has(provider)) {
    providerLimits.set(provider, {
      requests: [],
      queue: []
    });
  }
  
  return providerLimits.get(provider)!;
}

function cleanupOldRequests(limit: UserRateLimit, windowMs: number): void {
  const now = Date.now();
  limit.requests = limit.requests.filter(timestamp => now - timestamp < windowMs);
}

function cleanupExpiredQueue(limit: UserRateLimit): void {
  const now = Date.now();
  const expiredQueueItems = limit.queue.filter(item => now - item.timestamp > 300000);
  
  expiredQueueItems.forEach(item => {
    item.reject(new Error('Queue request expired after 5 minutes'));
  });
  
  limit.queue = limit.queue.filter(item => now - item.timestamp <= 300000);
}

async function checkRateLimit(
  userId: string,
  provider: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number; queued?: boolean }> {
  const limit = getUserLimit(userId, provider);
  const now = Date.now();
  
  cleanupOldRequests(limit, config.windowMs);
  cleanupExpiredQueue(limit);
  
  if (limit.requests.length < config.maxRequests) {
    limit.requests.push(now);
    return { allowed: true };
  }
  
  if (limit.queue.length < config.queueSize) {
    return new Promise((resolve, reject) => {
      limit.queue.push({
        resolve: () => {
          limit.requests.push(Date.now());
          resolve({ allowed: true, queued: true });
        },
        reject,
        timestamp: now
      });
      
      setTimeout(() => {
        processQueue(userId, provider);
      }, 1000);
    });
  }
  
  const oldestRequest = Math.min(...limit.requests);
  const retryAfter = Math.ceil((config.windowMs - (now - oldestRequest)) / 1000);
  
  return { allowed: false, retryAfter };
}

function processQueue(userId: string, provider: string): void {
  const limit = getUserLimit(userId, provider);
  const config = configs[provider];
  
  if (!config) return;
  
  cleanupOldRequests(limit, config.windowMs);
  
  while (limit.queue.length > 0 && limit.requests.length < config.maxRequests) {
    const queued = limit.queue.shift();
    if (queued) {
      queued.resolve();
    }
  }
  
  if (limit.queue.length > 0) {
    setTimeout(() => processQueue(userId, provider), 1000);
  }
}

export function createAIRateLimiter(provider: 'openai' | 'gemini') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Extract userId from Replit Auth (req.user.claims.sub)
    const userId = (req as any).user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Authentication required' });
    }
    
    const config = configs[provider];
    
    if (!config) {
      return res.status(500).json({ error: 'Invalid AI provider configuration' });
    }
    
    try {
      const result = await checkRateLimit(userId, provider, config);
      
      if (result.allowed) {
        if (result.queued) {
        }
        return next();
      }
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many ${provider} requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
        provider
      });
    } catch (error: any) {
      console.error(`[AI Rate Limiter] Error for user ${userId}:`, error);
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: error.message || 'Rate limiting service error'
      });
    }
  };
}

export function getAIRateLimitStats(userId: string, provider?: string): any {
  if (!userLimits.has(userId)) {
    return { totalProviders: 0, limits: {} };
  }
  
  const providerLimits = userLimits.get(userId)!;
  const stats: any = { totalProviders: providerLimits.size, limits: {} };
  
  for (const [prov, limit] of Array.from(providerLimits.entries())) {
    if (provider && prov !== provider) continue;
    
    const config = configs[prov];
    cleanupOldRequests(limit, config.windowMs);
    
    stats.limits[prov] = {
      requestsInWindow: limit.requests.length,
      maxRequests: config.maxRequests,
      queuedRequests: limit.queue.length,
      maxQueueSize: config.queueSize,
      remaining: Math.max(0, config.maxRequests - limit.requests.length)
    };
  }
  
  return stats;
}

export function clearAIRateLimit(userId: string, provider?: string): void {
  if (!userLimits.has(userId)) return;
  
  if (provider) {
    userLimits.get(userId)?.delete(provider);
  } else {
    userLimits.delete(userId);
  }
}

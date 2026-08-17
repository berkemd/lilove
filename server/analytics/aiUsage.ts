import { db } from '../db';
import { aiUsageStats } from '@shared/schema';
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm';

interface AIUsageLog {
  userId: string;
  provider: 'openai' | 'gemini';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  cacheHit: boolean;
  errorOccurred: boolean;
  endpoint: string;
}

interface TokenCostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
  'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
  'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 },
  'gemini-2.0-flash': { input: 0, output: 0 },
  'gemini-pro': { input: 0, output: 0 }
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): TokenCostEstimate {
  const costs = TOKEN_COSTS[model] || { input: 0, output: 0 };
  
  const inputCost = promptTokens * costs.input;
  const outputCost = completionTokens * costs.output;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost
  };
}

export async function logAIUsage(log: AIUsageLog): Promise<void> {
  try {
    const costEstimate = estimateCost(log.model, log.promptTokens, log.completionTokens);
    
    await db.insert(aiUsageStats).values({
      userId: log.userId,
      provider: log.provider,
      model: log.model,
      endpoint: log.endpoint,
      promptTokens: log.promptTokens,
      completionTokens: log.completionTokens,
      totalTokens: log.totalTokens,
      estimatedCost: costEstimate.totalCost.toString(),
      latencyMs: log.latencyMs,
      cacheHit: log.cacheHit,
      errorOccurred: log.errorOccurred,
      timestamp: new Date()
    });

    if (log.totalTokens > 0) {
    }
  } catch (error) {
  }
}

export async function getUserAIUsageStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  try {
    const conditions = [eq(aiUsageStats.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(aiUsageStats.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(aiUsageStats.timestamp, endDate));
    }

    const stats = await db
      .select({
        provider: aiUsageStats.provider,
        totalRequests: sql<number>`count(*)`,
        totalTokens: sql<number>`sum(${aiUsageStats.totalTokens})`,
        totalCost: sql<number>`sum(cast(${aiUsageStats.estimatedCost} as decimal))`,
        avgLatency: sql<number>`avg(${aiUsageStats.latencyMs})`,
        cacheHitRate: sql<number>`avg(case when ${aiUsageStats.cacheHit} then 1.0 else 0.0 end) * 100`,
        errorRate: sql<number>`avg(case when ${aiUsageStats.errorOccurred} then 1.0 else 0.0 end) * 100`
      })
      .from(aiUsageStats)
      .where(and(...conditions))
      .groupBy(aiUsageStats.provider);

    return stats;
  } catch (error) {
    return [];
  }
}

export async function getSystemAIUsageStats(
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  try {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(aiUsageStats.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(aiUsageStats.timestamp, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [providerStats, endpointStats, dailyStats] = await Promise.all([
      db
        .select({
          provider: aiUsageStats.provider,
          model: aiUsageStats.model,
          totalRequests: sql<number>`count(*)`,
          totalTokens: sql<number>`sum(${aiUsageStats.totalTokens})`,
          totalCost: sql<number>`sum(cast(${aiUsageStats.estimatedCost} as decimal))`,
          avgLatency: sql<number>`avg(${aiUsageStats.latencyMs})`,
          cacheHitRate: sql<number>`avg(case when ${aiUsageStats.cacheHit} then 1.0 else 0.0 end) * 100`,
          errorRate: sql<number>`avg(case when ${aiUsageStats.errorOccurred} then 1.0 else 0.0 end) * 100`
        })
        .from(aiUsageStats)
        .where(whereClause)
        .groupBy(aiUsageStats.provider, aiUsageStats.model),

      db
        .select({
          endpoint: aiUsageStats.endpoint,
          totalRequests: sql<number>`count(*)`,
          avgLatency: sql<number>`avg(${aiUsageStats.latencyMs})`
        })
        .from(aiUsageStats)
        .where(whereClause)
        .groupBy(aiUsageStats.endpoint),

      db
        .select({
          date: sql<string>`date(${aiUsageStats.timestamp})`,
          totalRequests: sql<number>`count(*)`,
          totalTokens: sql<number>`sum(${aiUsageStats.totalTokens})`,
          totalCost: sql<number>`sum(cast(${aiUsageStats.estimatedCost} as decimal))`
        })
        .from(aiUsageStats)
        .where(whereClause)
        .groupBy(sql`date(${aiUsageStats.timestamp})`)
        .orderBy(desc(sql`date(${aiUsageStats.timestamp})`))
        .limit(30)
    ]);

    return {
      byProvider: providerStats,
      byEndpoint: endpointStats,
      daily: dailyStats
    };
  } catch (error) {
    return {
      byProvider: [],
      byEndpoint: [],
      daily: []
    };
  }
}

export async function aggregateDailyAIUsage(date: Date): Promise<void> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dailyStats = await db
      .select({
        userId: aiUsageStats.userId,
        provider: aiUsageStats.provider,
        model: aiUsageStats.model,
        totalRequests: sql<number>`count(*)`,
        totalTokens: sql<number>`sum(${aiUsageStats.totalTokens})`,
        totalCost: sql<number>`sum(cast(${aiUsageStats.estimatedCost} as decimal))`,
        avgLatency: sql<number>`avg(${aiUsageStats.latencyMs})`,
        cacheHitCount: sql<number>`sum(case when ${aiUsageStats.cacheHit} then 1 else 0 end)`,
        errorCount: sql<number>`sum(case when ${aiUsageStats.errorOccurred} then 1 else 0 end)`
      })
      .from(aiUsageStats)
      .where(
        and(
          gte(aiUsageStats.timestamp, startOfDay),
          lte(aiUsageStats.timestamp, endOfDay)
        )
      )
      .groupBy(aiUsageStats.userId, aiUsageStats.provider, aiUsageStats.model);

    
    return;
  } catch (error) {
  }
}

export const aiUsageAnalytics = {
  log: logAIUsage,
  getUserStats: getUserAIUsageStats,
  getSystemStats: getSystemAIUsageStats,
  aggregateDaily: aggregateDailyAIUsage
};

export default aiUsageAnalytics;

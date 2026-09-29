export interface UserStats {
  totalGoals: number;
  streakCount: number;
  currentLevel: number;
  totalXp: number;
}

/** Fields consumed from the server's flat GET /api/user/stats response. */
export function readUserStats(value: unknown): UserStats {
  if (!value || typeof value !== 'object') throw new Error('Invalid user stats');
  const stats = value as Record<string, unknown>;
  for (const field of ['totalGoals', 'streakCount', 'currentLevel']) {
    const count = stats[field];
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new Error('Invalid user stats');
    }
  }
  // XP is a signed sum of ledger deltas, not a count of records.
  if (typeof stats.totalXp !== 'number' || !Number.isSafeInteger(stats.totalXp)) {
    throw new Error('Invalid user XP');
  }
  if ((stats.currentLevel as number) < 1) throw new Error('Invalid user level');
  return {
    totalGoals: stats.totalGoals as number,
    streakCount: stats.streakCount as number,
    currentLevel: stats.currentLevel as number,
    totalXp: stats.totalXp as number,
  };
}

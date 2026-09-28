export interface DashboardStats {
  activeGoals: number;
  completedTasks: number;
  totalHabits: number;
  streaks: number;
}

interface DashboardApi {
  getGoals(): Promise<unknown>;
  getCompletedTasks(): Promise<unknown>;
  getHabits(): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export async function loadDashboardStats(api: DashboardApi): Promise<DashboardStats> {
  const [goals, completed, habits] = await Promise.all([
    api.getGoals(),
    api.getCompletedTasks(),
    api.getHabits(),
  ]);

  if (
    !Array.isArray(goals) ||
    !goals.every((goal) => isRecord(goal) && typeof goal.status === 'string') ||
    !Array.isArray(habits) ||
    !habits.every((habit) => isRecord(habit) && isCount(habit.currentStreak ?? 0)) ||
    !isRecord(completed) ||
    !Array.isArray(completed.tasks) ||
    !completed.tasks.every((task) => isRecord(task) && task.status === 'completed') ||
    !isCount(completed.totalCount) ||
    completed.totalCount < completed.tasks.length ||
    (completed.totalCount > 0 && completed.tasks.length === 0)
  ) {
    throw new Error('Invalid dashboard response');
  }

  return {
    activeGoals: goals.filter((goal) => goal.status === 'active').length,
    // The filtered endpoint counts all matching tasks, including later pages.
    completedTasks: completed.totalCount,
    totalHabits: habits.length,
    streaks: habits.reduce((total, habit) => total + (habit.currentStreak ?? 0), 0),
  };
}

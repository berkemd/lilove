import type { Habit } from './habits';

export interface HabitProgress {
  done: number;
  total: number;
  remaining: number;
  ratio: number;
}

export function summarizeHabitProgress(habits: readonly Habit[]): HabitProgress {
  const visible = habits.filter((habit) => habit.isActive !== false && !habit.isPaused);
  const total = visible.length;
  const done = visible.filter((habit) => habit.completedToday === true).length;
  return { done, total, remaining: total - done, ratio: total === 0 ? 0 : done / total };
}

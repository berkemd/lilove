export type ProgressOverview = {
  version: 1;
  timeZone: string;
  asOf: string;
  goals: { id: string; title: string; targetOutcome: string | null }[];
  selectedGoalId: string | null;
  days: { date: string; completed: number }[];
  summary: { completedTasks: number; activeDays: number } | null;
  nextTask: {
    id: string;
    goalId: string;
    title: string;
    description: string | null;
    priority: string;
    status: 'active' | 'pending';
    estimatedDuration: number | null;
  } | null;
};

export function deviceTimeZone(): { timeZone: string; fallback: boolean } {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) throw new Error('Missing time zone');
    new Intl.DateTimeFormat('en', { timeZone }).format();
    return { timeZone, fallback: false };
  } catch {
    return { timeZone: 'UTC', fallback: true };
  }
}

function canonicalZone(timeZone: string): string {
  return timeZone === 'UTC'
    ? 'UTC'
    : new Intl.DateTimeFormat('en', { timeZone }).resolvedOptions().timeZone;
}

export function localDate(instant: Date, timeZone: string): string {
  if (timeZone === 'UTC') return instant.toISOString().slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (name: string) => parts.find((value) => value.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function weekDates(asOf: string, timeZone: string): string[] {
  const today = localDate(new Date(asOf), timeZone);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${today}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 6 + index);
    return day.toISOString().slice(0, 10);
  });
}

export function readProgressOverview(
  value: unknown,
  timeZone: string,
  selectedGoalId: string | null
): ProgressOverview {
  const data = value as ProgressOverview | null;
  const text = (item: unknown): item is string =>
    typeof item === 'string' && item.trim().length > 0;
  const count = (item: unknown) => Number.isSafeInteger(item) && Number(item) >= 0;
  if (
    !data ||
    data.version !== 1 ||
    typeof data.timeZone !== 'string' ||
    canonicalZone(data.timeZone) !== canonicalZone(timeZone) ||
    typeof data.asOf !== 'string' ||
    !Number.isFinite(Date.parse(data.asOf)) ||
    data.selectedGoalId !== selectedGoalId ||
    !Array.isArray(data.goals) ||
    !data.goals.every(
      (goal) =>
        goal &&
        text(goal.id) &&
        text(goal.title) &&
        (goal.targetOutcome === null || typeof goal.targetOutcome === 'string')
    ) ||
    new Set(data.goals.map((goal) => goal.id)).size !== data.goals.length ||
    !Array.isArray(data.days)
  ) {
    throw new Error('Invalid progress overview');
  }
  if (selectedGoalId === null) {
    if (data.days.length !== 0 || data.summary !== null || data.nextTask !== null)
      throw new Error('Unexpected unselected progress');
    return data;
  }
  const dates = weekDates(data.asOf, timeZone);
  if (
    !data.goals.some((goal) => goal.id === selectedGoalId) ||
    data.days.length !== 7 ||
    !data.days.every((day, index) => day && day.date === dates[index] && count(day.completed)) ||
    !data.summary ||
    !count(data.summary.completedTasks) ||
    !count(data.summary.activeDays) ||
    data.summary.completedTasks !== data.days.reduce((sum, day) => sum + day.completed, 0) ||
    data.summary.activeDays !== data.days.filter((day) => day.completed > 0).length
  ) {
    throw new Error('Incomplete progress evidence');
  }
  const task = data.nextTask;
  if (
    task !== null &&
    (!task ||
      !text(task.id) ||
      !text(task.title) ||
      task.goalId !== selectedGoalId ||
      !['active', 'pending'].includes(task.status) ||
      typeof task.priority !== 'string' ||
      (task.description !== null && typeof task.description !== 'string') ||
      (task.estimatedDuration !== null && !Number.isSafeInteger(task.estimatedDuration)))
  ) {
    throw new Error('Invalid next task');
  }
  return data;
}

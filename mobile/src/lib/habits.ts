export interface Habit {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  category: string;
  currentStreak?: number;
  longestStreak?: number;
  totalCompletions?: number;
  completedToday: boolean;
  isActive?: boolean;
  isPaused?: boolean;
}

export interface NewHabit {
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  frequency: 'daily';
  difficulty: string;
}

interface HabitTransport {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, data?: unknown, options?: { maxRetries: number }): Promise<T>;
}

function readHabit(value: unknown): Habit {
  if (!value || typeof value !== 'object') throw new Error('Invalid habit response');
  const habit = value as Habit;
  if (typeof habit.id !== 'string' || !habit.id || typeof habit.title !== 'string') {
    throw new Error('Invalid habit response');
  }
  return habit;
}

export function createHabitsApi(transport: HabitTransport) {
  return {
    async getHabits(): Promise<Habit[]> {
      const result = await transport.get<unknown>('/api/habits');
      if (!Array.isArray(result)) throw new Error('Invalid habits response');
      return result.map((value) => {
        const habit = readHabit(value);
        if (typeof habit.completedToday !== 'boolean') {
          throw new Error('Missing daily completion status');
        }
        return habit;
      });
    },
    async createHabit(habit: NewHabit): Promise<Habit> {
      // Retrying a POST after a lost response can create a second habit.
      return {
        ...readHabit(await transport.post('/api/habits', habit, { maxRetries: 0 })),
        completedToday: false,
      };
    },
    async trackHabit(id: string): Promise<Habit> {
      const result = await transport.post<{ habit: unknown }>(
        `/api/habits/${encodeURIComponent(id)}/check`,
        undefined,
        { maxRetries: 0 }
      );
      // The check endpoint returns { completion, habit }; completedToday is
      // added only by GET /api/habits, so a successful check supplies it here.
      return { ...readHabit(result?.habit), completedToday: true };
    },
  };
}

type HabitsApi = ReturnType<typeof createHabitsApi>;
type HabitError = 'load' | 'check' | 'create' | null;

export class HabitTracker {
  private state: {
    habits: Habit[];
    loading: boolean;
    saving: boolean;
    checkingId: string | null;
    error: HabitError;
  } = {
    habits: [],
    loading: true,
    saving: false,
    checkingId: null,
    error: null,
  };
  private listeners = new Set<() => void>();
  private busy = false;
  private refreshQueued = false;

  constructor(private api: HabitsApi) {}

  getSnapshot = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(patch: Partial<typeof this.state>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private async finish(patch: Partial<typeof this.state>) {
    this.busy = false;
    this.update(patch);
    if (this.refreshQueued) {
      this.refreshQueued = false;
      await this.refresh();
    }
  }

  async refresh(): Promise<void> {
    if (this.busy) {
      this.refreshQueued = true;
      return;
    }
    this.busy = true;
    this.update({ loading: true });
    try {
      this.update({ habits: await this.api.getHabits(), error: null });
    } catch {
      this.update({ error: 'load' });
    } finally {
      await this.finish({ loading: false });
    }
  }

  async create(habit: NewHabit): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    this.update({ saving: true, error: null });
    try {
      const created = await this.api.createHabit(habit);
      this.update({ habits: [created, ...this.state.habits] });
      return true;
    } catch {
      this.update({ error: 'create' });
      return false;
    } finally {
      await this.finish({ saving: false });
    }
  }

  async check(id: string): Promise<void> {
    if (this.busy || this.state.error) return;
    this.busy = true;
    this.update({ checkingId: id });
    try {
      // Read the server's day/status before writing. This also reconciles a
      // check-in made on another device and stale screens kept open overnight.
      const habits = await this.api.getHabits();
      this.update({ habits });
      const habit = habits.find((item) => item.id === id);
      if (!habit || habit.completedToday || habit.isActive === false || habit.isPaused) return;
      const checked = await this.api.trackHabit(id);
      this.update({
        habits: habits.map((item) => (item.id === id ? checked : item)),
      });
    } catch {
      // A lost response may follow a successful write. Reconcile instead of
      // automatically repeating a non-idempotent completion POST.
      this.update({ error: 'check' });
      try {
        const habits = await this.api.getHabits();
        this.update({
          habits,
          error: habits.find((item) => item.id === id)?.completedToday ? null : 'check',
        });
      } catch {
        /* Keep the last records and require an explicit refresh. */
      }
    } finally {
      await this.finish({ checkingId: null });
    }
  }
}

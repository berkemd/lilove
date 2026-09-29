import { readProgressOverview, type ProgressOverview } from './progressOverview';

type Snapshot = {
  accountKey: string | null;
  selectedGoalId: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  overview: ProgressOverview | null;
  completing: boolean;
  needsRefresh: boolean;
};
type Dependencies = {
  read: (key: string, goalId: string | null, current: () => boolean) => Promise<unknown>;
  complete: (key: string, taskId: string, current: () => boolean) => Promise<unknown>;
  loadSelection: (key: string) => Promise<string | null>;
  saveSelection: (key: string, id: string | null) => Promise<void>;
};

// Only the explicitly chosen goal ID is persisted. Counts and task content always come from the API.
export class DailyFocusStore {
  private state: Snapshot = {
    accountKey: null,
    selectedGoalId: null,
    status: 'idle',
    overview: null,
    completing: false,
    needsRefresh: false,
  };
  private listeners = new Set<() => void>();
  private scope = 0;
  private accountEpoch = 0;
  private request = 0;
  private hydration: Promise<void> = Promise.resolve();
  private pending: Promise<void> | null = null;
  private persistence: Promise<void> = Promise.resolve();
  constructor(
    private deps: Dependencies,
    public timeZone: string
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private publish(patch: Partial<Snapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private persist(key: string, id: string | null) {
    this.persistence = this.persistence
      .then(() => this.deps.saveSelection(key, id))
      .catch(() => {});
  }
  setAccount = (accountKey: string | null) => {
    if (accountKey === this.state.accountKey) return;
    this.scope++;
    const accountEpoch = ++this.accountEpoch;
    this.request++;
    this.pending = null;
    this.publish({
      accountKey,
      selectedGoalId: null,
      status: 'idle',
      overview: null,
      completing: false,
      needsRefresh: false,
    });
    this.hydration = accountKey
      ? this.persistence
          .then(() => this.deps.loadSelection(accountKey))
          .then((id) => {
            if (
              accountEpoch === this.accountEpoch &&
              typeof id === 'string' &&
              id.length > 0 &&
              id.length <= 128
            )
              this.publish({ selectedGoalId: id });
          })
          .catch(() => {})
      : Promise.resolve();
  };
  setTimeZone = (timeZone: string) => {
    if (timeZone === this.timeZone) return;
    this.timeZone = timeZone;
    this.scope++;
    this.request++;
    this.pending = null;
    this.publish({ overview: null, status: 'idle' });
  };
  select = async (id: string) => {
    const { accountKey, overview, completing } = this.state;
    if (!accountKey || completing || !overview?.goals.some((goal) => goal.id === id)) return;
    this.request++;
    this.pending = null;
    this.persist(accountKey, id);
    this.publish({ selectedGoalId: id, overview: null, needsRefresh: false });
    await this.refresh();
  };
  refresh = (): Promise<void> => {
    if (!this.state.accountKey || this.state.completing) return Promise.resolve();
    if (this.pending) return this.pending;
    const scope = this.scope;
    const request = ++this.request;
    const current = () => scope === this.scope && request === this.request;
    this.publish({ status: 'loading' });
    const pending = this.hydration
      .then(async () => {
        if (!current()) return;
        const { accountKey, selectedGoalId } = this.state;
        try {
          const response = await this.deps.read(accountKey!, selectedGoalId, current);
          if (!current()) return;
          const overview = readProgressOverview(response, this.timeZone, selectedGoalId);
          this.publish({ overview, status: 'ready', needsRefresh: false });
        } catch (error) {
          if (!current()) return;
          if (selectedGoalId && (error as { status?: number })?.status === 404) {
            this.persist(accountKey!, null);
            this.publish({ selectedGoalId: null, overview: null });
            try {
              const response = await this.deps.read(accountKey!, null, current);
              if (current())
                this.publish({
                  overview: readProgressOverview(response, this.timeZone, null),
                  status: 'ready',
                  needsRefresh: false,
                });
            } catch {
              if (current()) this.publish({ status: 'error' });
            }
          } else this.publish({ status: 'error' });
        }
      })
      .finally(() => {
        if (this.pending === pending) this.pending = null;
      });
    this.pending = pending;
    return pending;
  };
  complete = async () => {
    const { accountKey, status, completing, needsRefresh, overview } = this.state;
    if (!accountKey || status !== 'ready' || completing || needsRefresh || !overview?.nextTask)
      return;
    const accountEpoch = this.accountEpoch;
    this.request++;
    this.pending = null;
    const current = () => accountEpoch === this.accountEpoch;
    this.publish({ completing: true });
    try {
      await this.deps.complete(accountKey, overview.nextTask.id, current);
      if (!current()) return;
      this.publish({ completing: false, needsRefresh: true });
      await this.refresh();
    } catch {
      if (current()) this.publish({ completing: false, needsRefresh: true });
    }
  };
}

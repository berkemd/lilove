export type CoinBalanceSnapshot = {
  accountKey: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  balance: number | null;
};

export function parseCoinBalance(value: unknown): number {
  const balance = (value as { balance?: unknown } | null)?.balance;
  if (typeof balance !== 'number' || !Number.isSafeInteger(balance) || balance < 0) {
    throw new Error('Invalid coin balance');
  }
  return balance;
}

// Display state only: no profile writes or locally calculated credits/debits.
export class CoinBalanceStore {
  private snapshot: CoinBalanceSnapshot = { accountKey: null, status: 'idle', balance: null };
  private listeners = new Set<() => void>();
  private scope = 0;
  private request = 0;
  private pending: Promise<number | null> | null = null;

  constructor(private read: (accountKey: string) => Promise<unknown>) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private publish(snapshot: CoinBalanceSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
  // Guard follow-up UI work through logout/re-login, including the same UID.
  captureAccount = () => {
    const scope = this.scope;
    return () => this.snapshot.accountKey !== null && scope === this.scope;
  };
  setAccount = (accountKey: string | null) => {
    if (accountKey === this.snapshot.accountKey) return;
    this.scope++;
    this.request++;
    this.pending = null;
    this.publish({ accountKey, status: 'idle', balance: null });
  };
  refresh = (force = false): Promise<number | null> => {
    const { accountKey } = this.snapshot;
    if (!accountKey) return Promise.resolve(null);
    if (this.pending && !force) return this.pending;
    const scope = this.scope;
    const request = ++this.request;
    this.publish({ accountKey, status: 'loading', balance: null });
    const pending = Promise.resolve()
      .then(() => this.read(accountKey))
      .then((value) => {
        if (scope !== this.scope || request !== this.request) return null;
        const balance = parseCoinBalance(value);
        this.publish({ accountKey, status: 'ready', balance });
        return balance;
      })
      .catch(() => {
        if (scope === this.scope && request === this.request) {
          this.publish({ accountKey, status: 'error', balance: null });
        }
        return null;
      })
      .finally(() => {
        if (this.pending === pending) this.pending = null;
      });
    this.pending = pending;
    return pending;
  };
  confirm = async (
    action: () => Promise<unknown>
  ): Promise<'updated' | 'unverified' | 'account-changed'> => {
    if (!this.snapshot.accountKey) return 'account-changed';
    const scope = this.scope;
    try {
      await action();
    } catch (error) {
      if (scope !== this.scope) return 'account-changed';
      throw error;
    }
    if (scope !== this.scope) return 'account-changed';
    // A pre-purchase/pre-spend read cannot overwrite the resulting balance.
    const balance = await this.refresh(true);
    if (scope !== this.scope) return 'account-changed';
    return balance === null ? 'unverified' : 'updated';
  };
}

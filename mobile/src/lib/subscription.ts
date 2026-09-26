export type SubscriptionStatus = {
  subscriptionTier: 'free' | 'pro' | 'team';
  subscriptionStatus: 'active' | 'trialing' | 'inactive';
  subscriptionCurrentPeriodEnd: string | null;
  isPremium: boolean;
  features: {
    unlimitedGoals: boolean;
    aiCoaching: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
  };
};

export type SubscriptionSnapshot = {
  accountId: string | null;
  status: 'idle' | 'loading' | 'verified' | 'error';
  subscription: SubscriptionStatus | null;
};

export function parseSubscriptionStatus(value: unknown, now = Date.now()): SubscriptionStatus {
  const data = value as SubscriptionStatus | null;
  if (
    !data ||
    typeof data !== 'object' ||
    !['free', 'pro', 'team'].includes(data.subscriptionTier) ||
    !['active', 'trialing', 'inactive'].includes(data.subscriptionStatus) ||
    typeof data.isPremium !== 'boolean' ||
    !data.features ||
    !['unlimitedGoals', 'aiCoaching', 'advancedAnalytics', 'prioritySupport'].every(
      (key) => typeof data.features[key as keyof SubscriptionStatus['features']] === 'boolean'
    )
  ) {
    throw new Error('Invalid subscription status');
  }
  const end = data.subscriptionCurrentPeriodEnd;
  if (end !== null && (typeof end !== 'string' || !Number.isFinite(Date.parse(end)))) {
    throw new Error('Invalid subscription expiry');
  }
  const paidTier = data.subscriptionTier === 'pro' || data.subscriptionTier === 'team';
  const active = data.subscriptionStatus === 'active' || data.subscriptionStatus === 'trialing';
  if (
    (data.isPremium && (!paidTier || !active || end === null)) ||
    (!data.isPremium &&
      (data.subscriptionTier !== 'free' || data.subscriptionStatus !== 'inactive')) ||
    data.features.unlimitedGoals !== data.isPremium ||
    data.features.aiCoaching !== data.isPremium ||
    data.features.advancedAnalytics !== data.isPremium ||
    data.features.prioritySupport !== (data.isPremium && data.subscriptionTier === 'team')
  ) {
    throw new Error('Inconsistent subscription status');
  }
  if (data.isPremium && Date.parse(end!) <= now) throw new Error('Subscription needs revalidation');
  return { ...data, features: { ...data.features } };
}

// UI state only. It never writes entitlement claims to a user profile.
export class SubscriptionStore {
  private snapshot: SubscriptionSnapshot = { accountId: null, status: 'idle', subscription: null };
  private listeners = new Set<() => void>();
  private scope = 0;
  private request = 0;
  private pending: Promise<SubscriptionStatus | null> | null = null;

  constructor(
    private read: (accountId: string) => Promise<unknown>,
    private now: () => number = Date.now
  ) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private publish(snapshot: SubscriptionSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
  setAccount = (accountId: string | null) => {
    if (accountId === this.snapshot.accountId) return;
    this.scope++;
    this.request++;
    this.pending = null;
    this.publish({ accountId, status: 'idle', subscription: null });
  };

  refresh = (force = false): Promise<SubscriptionStatus | null> => {
    const { accountId } = this.snapshot;
    if (!accountId) return Promise.resolve(null);
    if (this.pending && !force) return this.pending;
    const scope = this.scope;
    const request = ++this.request;
    this.publish({ accountId, status: 'loading', subscription: null });
    const pending = Promise.resolve()
      .then(() => this.read(accountId))
      .then((value) => {
        if (scope !== this.scope || request !== this.request) return null;
        const subscription = parseSubscriptionStatus(value, this.now());
        this.publish({ accountId, status: 'verified', subscription });
        return subscription;
      })
      .catch(() => {
        if (scope === this.scope && request === this.request)
          this.publish({ accountId, status: 'error', subscription: null });
        return null;
      })
      .finally(() => {
        if (this.pending === pending) this.pending = null;
      });
    this.pending = pending;
    return pending;
  };

  expire = () => {
    const subscription = this.snapshot.subscription;
    if (
      subscription?.isPremium &&
      Date.parse(subscription.subscriptionCurrentPeriodEnd!) <= this.now()
    ) {
      // A renewal may exist. An expired cached period is unknown until refreshed,
      // not proof of either a new paid period or a downgrade to Free.
      this.publish({ ...this.snapshot, status: 'idle', subscription: null });
    }
  };

  confirm = async (
    action: () => Promise<unknown>
  ): Promise<'active' | 'inactive' | 'unverified' | 'account-changed'> => {
    if (!this.snapshot.accountId) return 'account-changed';
    const scope = this.scope;
    try {
      await action();
    } catch (error) {
      if (scope !== this.scope) return 'account-changed';
      throw error;
    }
    if (scope !== this.scope) return 'account-changed';
    // A request started before StoreKit finished must not decide this result.
    const subscription = await this.refresh(true);
    if (scope !== this.scope) return 'account-changed';
    if (!subscription) return 'unverified';
    return subscription.isPremium ? 'active' : 'inactive';
  };
}

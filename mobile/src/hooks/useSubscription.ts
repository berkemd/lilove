import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';
import { SubscriptionStore, type SubscriptionSnapshot } from '../lib/subscription';
import { useAuthStore } from '../store/authStore';

const subscriptions = new SubscriptionStore(async (accountId) => {
  const user = useAuthStore.getState().user;
  if (!user || user.uid !== accountId) throw new Error('Account changed');
  // Bind this request to its Firebase user, including while authStore is replacing
  // the shared token. A delayed request must never read another account's result.
  const token = await user.getIdToken();
  if (useAuthStore.getState().user?.uid !== accountId) throw new Error('Account changed');
  return api.getSubscriptionStatus(token);
});

function syncAccount() {
  const { user, isAuthenticated, isDemo } = useAuthStore.getState();
  subscriptions.setAccount(isAuthenticated && !isDemo ? user?.uid || null : null);
}
syncAccount();
useAuthStore.subscribe(syncAccount);

// Demo is a labelled local sample, not an entitlement read or an authenticated account.
const demoSnapshot: SubscriptionSnapshot = {
  accountId: null,
  status: 'verified',
  subscription: {
    subscriptionTier: 'free',
    subscriptionStatus: 'inactive',
    subscriptionCurrentPeriodEnd: null,
    isPremium: false,
    features: {
      unlimitedGoals: false,
      aiCoaching: false,
      advancedAnalytics: false,
      prioritySupport: false,
    },
  },
};

export function useSubscription() {
  const isDemo = useAuthStore((state) => state.isDemo);
  const state = useSyncExternalStore(subscriptions.subscribe, subscriptions.getSnapshot);
  useFocusEffect(
    useCallback(() => {
      if (state.accountId) void subscriptions.refresh();
    }, [state.accountId])
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (value) => {
      if (value === 'active') {
        subscriptions.expire();
        void subscriptions.refresh();
      }
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    const subscription = state.subscription;
    if (!subscription?.isPremium) return;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleExpiry = () => {
      const remaining = Date.parse(subscription.subscriptionCurrentPeriodEnd!) - Date.now();
      if (remaining <= 0) {
        subscriptions.expire();
        void subscriptions.refresh();
      } else timer = setTimeout(scheduleExpiry, Math.min(remaining, 2147483647));
    };
    scheduleExpiry();
    return () => clearTimeout(timer);
  }, [state.subscription]);
  return {
    ...(isDemo ? demoSnapshot : state),
    refresh: subscriptions.refresh,
    confirm: subscriptions.confirm,
  };
}

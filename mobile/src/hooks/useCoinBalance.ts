import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';
import { CoinBalanceStore } from '../lib/coinBalance';
import { DEMO_TOKEN } from '../lib/demoData';
import { useAuthStore } from '../store/authStore';

function accountKey() {
  const { user, isAuthenticated, isDemo } = useAuthStore.getState();
  if (!isAuthenticated) return null;
  return isDemo ? 'demo' : user?.uid ? `user:${user.uid}` : null;
}

const balances = new CoinBalanceStore(async (key) => {
  if (accountKey() !== key) throw new Error('Account changed');
  if (key === 'demo') return api.getCoinBalance(DEMO_TOKEN);
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('Account changed');
  const token = await user.getIdToken();
  if (accountKey() !== key || useAuthStore.getState().user !== user) {
    throw new Error('Account changed');
  }
  return api.getCoinBalance(token);
});

const syncAccount = () => balances.setAccount(accountKey());
syncAccount();
useAuthStore.subscribe(syncAccount);

export function useCoinBalance() {
  const state = useSyncExternalStore(balances.subscribe, balances.getSnapshot);
  useFocusEffect(
    useCallback(() => {
      void balances.refresh();
      const listener = AppState.addEventListener('change', (value) => {
        if (value === 'active') void balances.refresh();
      });
      return () => listener.remove();
    }, [state.accountKey])
  );
  return {
    ...state,
    refresh: balances.refresh,
    confirm: balances.confirm,
    captureAccount: balances.captureAccount,
  };
}

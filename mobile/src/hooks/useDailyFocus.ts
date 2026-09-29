import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { DEMO_TOKEN } from '../lib/demoData';
import { DailyFocusStore } from '../lib/dailyFocus';
import { deviceTimeZone } from '../lib/progressOverview';

function accountKey() {
  const { user, isAuthenticated, isDemo } = useAuthStore.getState();
  if (!isAuthenticated) return null;
  return isDemo ? 'demo' : user?.uid ? `user:${user.uid}` : null;
}

async function authorization(key: string, current: () => boolean) {
  if (!current() || key !== accountKey()) throw new Error('Account changed');
  if (key === 'demo') return DEMO_TOKEN;
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('Account changed');
  const token = await user.getIdToken();
  if (!current() || key !== accountKey() || user !== useAuthStore.getState().user)
    throw new Error('Account changed');
  return token;
}

let zone = deviceTimeZone();
const selectionKey = (key: string) => `@lilove_focus_goal:${encodeURIComponent(key)}`;
const focus = new DailyFocusStore(
  {
    read: async (key, goalId, current) =>
      api.getProgressOverview(zone.timeZone, goalId, await authorization(key, current)),
    complete: async (key, id, current) => api.completeTask(id, await authorization(key, current)),
    loadSelection: (key) => AsyncStorage.getItem(selectionKey(key)),
    saveSelection: (key, id) =>
      id === null
        ? AsyncStorage.removeItem(selectionKey(key))
        : AsyncStorage.setItem(selectionKey(key), id),
  },
  zone.timeZone
);
const syncAccount = () => focus.setAccount(accountKey());
syncAccount();
useAuthStore.subscribe(syncAccount);

export const refreshDailyFocus = () => {
  zone = deviceTimeZone();
  focus.setTimeZone(zone.timeZone);
  return focus.refresh();
};

export function useDailyFocus() {
  const state = useSyncExternalStore(focus.subscribe, focus.getSnapshot);
  useFocusEffect(
    useCallback(() => {
      void refreshDailyFocus();
      const listener = AppState.addEventListener('change', (value) => {
        if (value === 'active') void refreshDailyFocus();
      });
      return () => listener.remove();
    }, [state.accountKey])
  );
  return {
    ...state,
    ...zone,
    refresh: refreshDailyFocus,
    select: focus.select,
    complete: focus.complete,
  };
}

import type { DeletionSnapshot } from './accountDeletion';

type Store = {
  getSnapshot: () => DeletionSnapshot;
  subscribe: (listener: () => void) => () => void;
  refresh: () => Promise<void>;
};
type Activity = {
  currentState: string;
  addEventListener: (type: 'change', listener: (state: string) => void) => { remove: () => void };
};

// At most one minute per open screen. Manual status checks remain available.
export function watchDeletionProgress(store: Store, activity: Activity, limit = 12) {
  let alive = true;
  let active = activity.currentState === 'active';
  let remaining = limit;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const update = () => {
    const state = store.getSnapshot();
    if (
      !alive ||
      !active ||
      !state.open ||
      remaining <= 0 ||
      !['pending', 'processing', 'retrying'].includes(state.record?.deletion?.status || '')
    ) {
      clear();
      return;
    }
    if (state.busy || running || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      if (!alive || !active || store.getSnapshot().busy) {
        update();
        return;
      }
      remaining--;
      running = true;
      void store
        .refresh()
        .catch(() => {})
        .finally(() => {
          running = false;
          update();
        });
    }, 5000);
  };
  const unsubscribe = store.subscribe(update);
  const listener = activity.addEventListener('change', (value) => {
    active = value === 'active';
    update();
  });
  update();
  return () => {
    alive = false;
    clear();
    unsubscribe();
    listener.remove();
  };
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));

function load(relative, imports, clock) {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', code)(
    (name) => {
      if (name === '../lib/credentialDeadline')
        return load('src/lib/credentialDeadline.ts', {}, clock);
      assert(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    clock.setTimeout,
    clock.clearTimeout
  );
  return module.exports;
}
const flush = () => new Promise(setImmediate);
function deferred() {
  let resolve;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
function fixture({ demo = false, token = async () => 'fresh-token', selected = false } = {}) {
  let ticks = 0;
  const timers = new Map();
  let seq = 0;
  const clock = {
    setTimeout(fn, ms) {
      const id = ++seq;
      timers.set(id, { fn, at: ticks + ms });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    advance(ms) {
      ticks += ms;
      for (const [id, timer] of [...timers])
        if (timer.at <= ticks) {
          timers.delete(id);
          timer.fn();
        }
    },
  };
  let user = { uid: 'owned-synthetic-user', getIdToken: token };
  const listeners = [];
  const state = { isAuthenticated: true, isDemo: demo, user };
  const auth = {
    getState: () => state,
    subscribe: (fn) => {
      listeners.push(fn);
      return () => {};
    },
  };
  const calls = [];
  const progress = load('src/lib/progressOverview.ts', {}, clock);
  const actualStore = load('src/lib/dailyFocus.ts', { './progressOverview': progress }, clock);
  const api = {
    async getProgressOverview(zone, goal, authorization) {
      calls.push(['GET', zone, goal, authorization]);
      const asOf = '2026-10-31T00:00:00Z';
      return {
        version: 1,
        timeZone: zone,
        asOf,
        goals: selected ? [{ id: 'g1', title: 'Synthetic goal', targetOutcome: null }] : [],
        selectedGoalId: goal,
        days: goal ? progress.weekDates(asOf, zone).map((date) => ({ date, completed: 0 })) : [],
        summary: goal ? { completedTasks: 0, activeDays: 0 } : null,
        nextTask: goal
          ? {
              id: 't1',
              goalId: goal,
              title: 'Synthetic task',
              description: null,
              priority: 'medium',
              status: 'pending',
              estimatedDuration: 5,
            }
          : null,
      };
    },
    async completeTask(id, authorization) {
      calls.push(['POST', id, authorization]);
    },
  };
  const hook = load(
    'src/hooks/useDailyFocus.ts',
    {
      react: {
        useCallback: (fn) => fn,
        useSyncExternalStore: (_, snapshot) => snapshot(),
      },
      'react-native': {
        AppState: { addEventListener: () => ({ remove() {} }) },
      },
      '@react-navigation/native': { useFocusEffect: () => {} },
      '@react-native-async-storage/async-storage': {
        default: {
          getItem: async () => (selected ? 'g1' : null),
          setItem: async () => {},
          removeItem: async () => {},
        },
      },
      '../store/authStore': { useAuthStore: auth },
      '../lib/api': { api },
      '../lib/demoData': { DEMO_TOKEN: 'explicit-demo-token' },
      '../lib/dailyFocus': actualStore,
      '../lib/progressOverview': {
        ...progress,
        deviceTimeZone: () => ({ timeZone: 'UTC', fallback: false }),
      },
      '../i18n': { t: (key) => key },
    },
    clock
  );
  return {
    read: () => hook.useDailyFocus(),
    clock,
    calls,
    timers,
    replaceUser(next) {
      user = next;
      state.user = next;
      for (const fn of listeners) fn();
    },
    setToken(next) {
      user.getIdToken = next;
    },
  };
}

test('pending SDK credential leaves loading after 15 seconds, with zero HTTP and no late-token request', async () => {
  const late = deferred();
  const f = fixture({ token: () => late.promise });
  const request = f.read().refresh();
  await flush();
  assert.equal(f.read().status, 'loading');
  f.clock.advance(14999);
  await flush();
  assert.equal(f.read().status, 'loading');
  assert.equal(f.calls.length, 0);
  f.clock.advance(1);
  await flush();
  assert.equal(f.read().status, 'error');
  await request;
  late.resolve('late-token');
  await flush();
  assert.equal(f.calls.length, 0);
  assert.equal(f.read().overview, null);
  assert.equal(f.timers.size, 0);
});

test('normal credential reaches existing API exactly once and clears deadline', async () => {
  const f = fixture();
  await f.read().refresh();
  assert.equal(f.read().status, 'ready');
  assert.deepEqual(f.calls, [['GET', 'UTC', null, 'fresh-token']]);
  assert.equal(f.timers.size, 0);
});

test('credential timeout during task completion does not POST or automatically retry; explicit refresh recovers', async () => {
  const f = fixture({ selected: true });
  await f.read().refresh();
  assert.equal(f.read().overview.nextTask.id, 't1');
  const late = deferred();
  f.setToken(() => late.promise);
  const writing = f.read().complete();
  await flush();
  assert.equal(f.read().completing, true);
  f.clock.advance(15000);
  await flush();
  assert.equal(f.read().completing, false);
  assert.equal(f.read().needsRefresh, true);
  await writing;
  late.resolve('late-write-token');
  await flush();
  assert.equal(f.calls.filter((x) => x[0] === 'POST').length, 0);
  f.setToken(async () => 'recovered-token');
  await f.read().refresh();
  assert.equal(f.read().status, 'ready');
  assert.equal(f.read().needsRefresh, false);
  assert.equal(f.calls.at(-1)[3], 'recovered-token');
});

test('same-uid user replacement while credential awaits cannot send stale HTTP', async () => {
  const late = deferred();
  const f = fixture({ token: () => late.promise });
  const request = f.read().refresh();
  await flush();
  f.replaceUser({
    uid: 'owned-synthetic-user',
    getIdToken: async () => 'replacement-token',
  });
  late.resolve('old-instance-token');
  await request;
  assert.equal(f.read().status, 'error');
  assert.equal(f.calls.length, 0);
  assert.equal(f.timers.size, 0);
});

test('demo uses explicit existing sample authorization without SDK access or deadline', async () => {
  const f = fixture({
    demo: true,
    token: () => {
      throw new Error('Must not access SDK in demo');
    },
  });
  await f.read().refresh();
  assert.equal(f.read().status, 'ready');
  assert.deepEqual(f.calls, [['GET', 'UTC', null, 'explicit-demo-token']]);
  assert.equal(f.timers.size, 0);
});

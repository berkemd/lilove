const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');
function load(relative, imports = {}, globals = {}) {
  const filename = path.join(__dirname, '..', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
    (name) => {
      assert(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    ...Object.values(globals)
  );
  return module.exports;
}
const overviewLib = load('src/lib/progressOverview.ts');
const { DailyFocusStore } = load('src/lib/dailyFocus.ts', { './progressOverview': overviewLib });
const { weekDates, readProgressOverview } = overviewLib;
const asOf = '2026-03-09T01:00:00.000Z';
function response(goalId = null, overrides = {}) {
  const days = weekDates(asOf, 'America/New_York').map((date, index) => ({
    date,
    completed: index === 6 ? 2 : 0,
  }));
  return {
    version: 1,
    timeZone: 'America/New_York',
    asOf,
    goals: [
      { id: 'g1', title: 'Learn guitar', targetOutcome: 'Play one song' },
      { id: 'g2', title: 'Walk', targetOutcome: null },
    ],
    selectedGoalId: goalId,
    days: goalId ? days : [],
    summary: goalId ? { completedTasks: 2, activeDays: 1 } : null,
    nextTask: goalId
      ? {
          id: 't1',
          goalId,
          title: 'Practice a verse',
          description: null,
          status: 'pending',
          priority: 'medium',
          estimatedDuration: 15,
        }
      : null,
    ...overrides,
  };
}
const flush = () => new Promise(setImmediate);
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function fixture(overrides = {}) {
  const saved = new Map();
  const reads = [],
    writes = [];
  const deps = {
    read: async (key, goal) => {
      reads.push([key, goal]);
      return response(goal);
    },
    complete: async (key, id) => {
      writes.push([key, id]);
    },
    loadSelection: async (key) => saved.get(key) ?? null,
    saveSelection: async (key, id) => {
      saved.set(key, id);
    },
    ...overrides,
  };
  return { store: new DailyFocusStore(deps, 'America/New_York'), saved, reads, writes };
}

test('exact contract uses seven local calendar dates across DST, never seven elapsed UTC days', () => {
  assert.deepEqual(weekDates(asOf, 'America/New_York'), [
    '2026-03-02',
    '2026-03-03',
    '2026-03-04',
    '2026-03-05',
    '2026-03-06',
    '2026-03-07',
    '2026-03-08',
  ]);
  assert.equal(
    readProgressOverview(response('g1'), 'America/New_York', 'g1').summary.completedTasks,
    2
  );
  assert.equal(readProgressOverview(response(), 'America/New_York', null).summary, null);
});

test('partial, malformed, wrong-owner and inconsistent data fail instead of manufacturing progress', () => {
  for (const bad of [
    null,
    {},
    response('g1', { days: response('g1').days.slice(1) }),
    response('g1', { summary: { completedTasks: 100, activeDays: 1 } }),
    response('g1', { summary: { completedTasks: 2, activeDays: 7 } }),
    response('g1', { nextTask: { ...response('g1').nextTask, goalId: 'foreign' } }),
    response('g1', { goals: [] }),
    response('g1', { timeZone: 'UTC' }),
    response('g2'),
    response('g1', { days: response('g1').days.map((day) => ({ ...day, completed: -1 })) }),
    response('g1', { nextTask: undefined }),
  ]) {
    assert.throws(() => readProgressOverview(bad, 'America/New_York', 'g1'));
  }
  assert.throws(() =>
    readProgressOverview(
      response(null, { nextTask: response('g1').nextTask }),
      'America/New_York',
      null
    )
  );
});

test('device timezone fallback is explicit rather than silently inventing a local day', () => {
  const lib = load(
    'src/lib/progressOverview.ts',
    {},
    {
      Intl: {
        DateTimeFormat() {
          throw new Error('unavailable');
        },
      },
    }
  );
  assert.deepEqual(lib.deviceTimeZone(), { timeZone: 'UTC', fallback: true });
  assert.equal(lib.weekDates(asOf, 'UTC')[6], '2026-03-09');
  assert.equal(
    lib.readProgressOverview(response(null, { timeZone: 'UTC' }), 'UTC', null).summary,
    null
  );
});

test('no implicit selection; chosen ID alone persists in an account-specific key', async () => {
  const { store, reads, saved } = fixture();
  store.setAccount('user:A');
  await store.refresh();
  assert.equal(store.getSnapshot().selectedGoalId, null);
  assert.deepEqual(reads, [['user:A', null]]);
  await store.select('foreign');
  assert.equal(reads.length, 1);
  await store.select('g1');
  await flush();
  assert.deepEqual([...saved], [['user:A', 'g1']]);
  store.setAccount('demo');
  await store.refresh();
  assert.equal(store.getSnapshot().selectedGoalId, null);
  store.setAccount('user:A');
  await store.refresh();
  assert.equal(store.getSnapshot().selectedGoalId, 'g1');
});

test('A → B → A late read cannot overwrite the new A session', async () => {
  const old = deferred();
  let first = true;
  const { store } = fixture({
    read: async (_key, goal) => {
      if (first) {
        first = false;
        return old.promise;
      }
      return response(goal, { goals: [] });
    },
  });
  store.setAccount('A');
  const pending = store.refresh();
  await flush();
  store.setAccount('B');
  await store.refresh();
  store.setAccount('A');
  await store.refresh();
  old.resolve(response());
  await pending;
  assert.deepEqual(store.getSnapshot().overview.goals, []);
});

test('late selection hydration cannot carry an old account goal into a new account', async () => {
  const old = deferred();
  const { store } = fixture({
    loadSelection: (key) => (key === 'A' ? old.promise : Promise.resolve(null)),
  });
  store.setAccount('A');
  const first = store.refresh();
  await flush();
  store.setAccount('B');
  await store.refresh();
  old.resolve('g1');
  await first;
  assert.equal(store.getSnapshot().selectedGoalId, null);
  assert.equal(store.getSnapshot().accountKey, 'B');
});

test('deleted or inactive stored goal clears safely and reloads the explicit picker', async () => {
  const { store, saved, reads } = fixture({
    read: async (key, goal) => {
      reads.push([key, goal]);
      if (goal) throw { status: 404 };
      return response();
    },
  });
  saved.set('A', 'g1');
  store.setAccount('A');
  await store.refresh();
  await flush();
  assert.deepEqual(reads, [
    ['A', 'g1'],
    ['A', null],
  ]);
  assert.equal(saved.get('A'), null);
  assert.equal(store.getSnapshot().status, 'ready');
});

test('duplicate completion taps issue one mutation then display fresh server evidence', async () => {
  const pending = deferred();
  let done = false;
  const { store, writes } = fixture({
    complete: async (key, id) => {
      writes.push([key, id]);
      await pending.promise;
      done = true;
    },
    read: async (_key, goal) =>
      response(
        goal,
        done
          ? {
              nextTask: null,
              days: response(goal).days.map((day, index) => ({
                ...day,
                completed: index === 6 ? 3 : 0,
              })),
              summary: { completedTasks: 3, activeDays: 1 },
            }
          : {}
      ),
  });
  store.setAccount('A');
  await store.refresh();
  await store.select('g1');
  const first = store.complete();
  await store.complete();
  await store.select('g2');
  assert.deepEqual(writes, [['A', 't1']]);
  assert.equal(store.getSnapshot().selectedGoalId, 'g1');
  assert.equal(store.getSnapshot().overview.summary.completedTasks, 2);
  pending.resolve();
  await first;
  assert.equal(store.getSnapshot().overview.summary.completedTasks, 3);
  assert.equal(store.getSnapshot().needsRefresh, false);
});

test('uncertain mutation preserves state and blocks replay until a successful read', async () => {
  let failRead = false,
    count = 0;
  const { store } = fixture({
    complete: async () => {
      count++;
      throw { code: 'OUTCOME_UNKNOWN' };
    },
    read: async (_key, goal) => {
      if (failRead) throw new Error('offline');
      return response(goal);
    },
  });
  store.setAccount('A');
  await store.refresh();
  await store.select('g1');
  await store.complete();
  assert.equal(store.getSnapshot().needsRefresh, true);
  await store.complete();
  assert.equal(count, 1);
  failRead = true;
  await store.refresh();
  await store.complete();
  assert.equal(count, 1);
  assert.equal(store.getSnapshot().overview.summary.completedTasks, 2);
  assert.equal(store.getSnapshot().status, 'error');
  failRead = false;
  await store.refresh();
  assert.equal(store.getSnapshot().needsRefresh, false);
});

test('account switch during mutation cannot refresh or modify the next session', async () => {
  const pending = deferred();
  const { store, reads } = fixture({ complete: () => pending.promise });
  store.setAccount('A');
  await store.refresh();
  await store.select('g1');
  const completing = store.complete();
  store.setAccount('B');
  await store.refresh();
  pending.resolve();
  await completing;
  assert.equal(store.getSnapshot().accountKey, 'B');
  assert.equal(store.getSnapshot().selectedGoalId, null);
  assert.equal(store.getSnapshot().needsRefresh, false);
  assert.deepEqual(reads, [
    ['A', null],
    ['A', 'g1'],
    ['B', null],
  ]);
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  return Object.values(node)
    .map((value) => find(value, predicate))
    .find(Boolean);
}
function card(state, locale = 'en', dark = false) {
  const { [locale]: catalog } = load(`src/i18n/${locale}.ts`);
  const actions = [];
  const element = (type, props) => ({ type, props });
  const Component = load('src/components/DailyFocusCard.tsx', {
    react: { useState: () => [false, () => {}] },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': {
      StyleSheet: { create: (v) => v },
      ActivityIndicator: 'ActivityIndicator',
      View: 'View',
      Text: 'Text',
      TouchableOpacity: 'TouchableOpacity',
    },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '../theme/ThemeProvider': { useTheme: () => ({ isDark: dark }) },
    '../i18n': { dil: locale, t: (key) => catalog[key] },
    '../hooks/useDailyFocus': {
      useDailyFocus: () => ({
        status: 'ready',
        overview: response('g1'),
        selectedGoalId: 'g1',
        select: (id) => actions.push(['select', id]),
        complete: () => actions.push(['complete']),
        refresh: () => actions.push(['refresh']),
        ...state,
      }),
    },
  }).default;
  const tree = Component({
    onGoals: () => actions.push(['goals']),
    onTasks: () => actions.push(['tasks']),
  });
  return { tree, actions, byId: (id) => find(tree, (node) => node.props?.testID === id), catalog };
}

test('real card offers explicit goal choice and the existing empty goal/task routes', () => {
  const picker = card({ overview: response(), selectedGoalId: null });
  assert.equal(picker.byId('focus-complete'), undefined);
  picker.byId('focus-goal-g2').props.onPress();
  assert.deepEqual(picker.actions, [['select', 'g2']]);
  const empty = card({ overview: response(null, { goals: [] }), selectedGoalId: null });
  empty.byId('focus-create-goal').props.onPress();
  assert.deepEqual(empty.actions, [['goals']]);
  const noTask = card({ overview: response('g1', { nextTask: null }) });
  noTask.byId('focus-add-task').props.onPress();
  assert.deepEqual(noTask.actions, [['tasks']]);
});

test('actual card renders localized seven-day counts, accessible day records, dark mode and explicit completion', () => {
  for (const locale of ['en', 'tr', 'de', 'fr', 'es', 'it', 'ja']) {
    const ui = card({}, locale, true);
    assert.equal(
      ui.byId('focus-week-count').props.children,
      ui.catalog.focus_week_count.replace('{count}', '2').replace('{days}', '1')
    );
    assert.equal(ui.byId('focus-complete').props.accessibilityRole, 'button');
    ui.byId('focus-complete').props.onPress();
    assert.deepEqual(ui.actions, [['complete']]);
    for (const day of response('g1').days)
      assert(
        find(
          ui.tree,
          (node) =>
            node.key === day.date || node.props?.accessibilityLabel?.includes(String(day.completed))
        )
      );
    assert.equal(ui.tree.props.style[1].backgroundColor, '#172A24');
  }
});

test('failed/unknown card hides stale evidence, keeps refresh and never offers replay', () => {
  for (const state of [{ status: 'error' }, { needsRefresh: true }]) {
    const ui = card(state);
    assert.equal(ui.byId('focus-week-count'), undefined);
    assert.equal(ui.byId('focus-complete'), undefined);
    ui.byId('focus-refresh').props.onPress();
    assert.deepEqual(ui.actions, [['refresh']]);
  }
});

test('demo overview follows the same selected-goal contract and updates only sample evidence', () => {
  const demo = load('src/lib/demoData.ts', { '../i18n': { t: (key) => key } });
  demo.demoSifirla();
  const url = '/api/progress/overview?timeZone=America%2FNew_York';
  const first = demo.demoCevap('GET', url);
  readProgressOverview(first, 'America/New_York', null);
  const goal = first.goals[0].id;
  const selected = demo.demoCevap('GET', `${url}&goalId=${goal}`);
  readProgressOverview(selected, 'America/New_York', goal);
  demo.demoCevap('POST', `/api/tasks/${selected.nextTask.id}/complete`);
  const after = demo.demoCevap('GET', `${url}&goalId=${goal}`);
  readProgressOverview(after, 'America/New_York', goal);
  assert.equal(after.summary.completedTasks, selected.summary.completedTasks + 1);
});

test('demo next actions match unfinished goal steps and outcomes use the selected language', () => {
  const demo = load('src/lib/demoData.ts', {
    '../i18n': { t: (key) => `localized:${key}` },
  });
  demo.demoSifirla();
  const goals = demo.demoCevap('GET', '/api/goals');
  const overview = (id) =>
    demo.demoCevap('GET', `/api/progress/overview?timeZone=UTC&goalId=${id}`);
  for (const goal of goals) {
    assert.ok(goal.targetOutcome.startsWith('localized:'), goal.id);
    if (goal.status !== 'active') continue;
    const next = overview(goal.id).nextTask;
    assert.ok(next, goal.id);
    assert.equal(next.goalId, goal.id);
    assert.ok(
      goal.steps.some((step) => !step.done && step.title === next.title),
      goal.id
    );
  }
  const otherGoalBefore = overview('g2');
  demo.demoCevap('POST', `/api/tasks/${overview('g1').nextTask.id}/complete`);
  assert.equal(overview('g1').nextTask, null);
  assert.deepEqual(overview('g2').nextTask, otherGoalBefore.nextTask);
  assert.deepEqual(overview('g2').summary, otherGoalBefore.summary);
});

test('canonical response zones accept equivalent requested aliases, never a different day zone', () => {
  assert.equal(
    readProgressOverview(response('g1'), 'US/Eastern', 'g1').timeZone,
    'America/New_York'
  );
  assert.throws(() => readProgressOverview(response('g1'), 'Europe/Istanbul', 'g1'));
});

test('hook pins the authenticated token and invalidates A-B-A work while token acquisition is pending', async () => {
  const token = deferred();
  let account = {
    isAuthenticated: true,
    isDemo: false,
    user: { uid: 'A', getIdToken: () => token.promise },
  };
  let sync;
  const reads = [],
    writes = [];
  const auth = {
    getState: () => account,
    subscribe: (fn) => {
      sync = fn;
    },
  };
  const module = load('src/hooks/useDailyFocus.ts', {
    react: { useCallback: (fn) => fn, useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
    '@react-navigation/native': { useFocusEffect: () => {} },
    '@react-native-async-storage/async-storage': {
      default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
    },
    '../store/authStore': { useAuthStore: auth },
    '../lib/api': {
      api: {
        getProgressOverview: async (_zone, goal, authorization) => {
          reads.push(authorization);
          return response(goal);
        },
        completeTask: async (id, authorization) => {
          writes.push([id, authorization]);
        },
      },
    },
    '../lib/demoData': { DEMO_TOKEN: 'demo-session' },
    '../lib/dailyFocus': { DailyFocusStore },
    '../lib/progressOverview': {
      deviceTimeZone: () => ({ timeZone: 'America/New_York', fallback: false }),
    },
  });
  const old = module.useDailyFocus().refresh();
  await flush();
  account = { ...account, user: { uid: 'B', getIdToken: async () => 'B-pinned' } };
  sync();
  account = { ...account, user: { uid: 'A', getIdToken: async () => 'A-new-pinned' } };
  sync();
  await module.useDailyFocus().refresh();
  token.resolve('A-old-pinned');
  await old;
  assert.deepEqual(reads, ['A-new-pinned']);
  await module.useDailyFocus().select('g1');
  await module.useDailyFocus().complete();
  assert.deepEqual(writes, [['t1', 'A-new-pinned']]);
});

test('a device zone change invalidates old day bins while retaining the chosen goal', async () => {
  const delayed = deferred();
  let zone = 'America/New_York';
  let delay = false;
  const { store } = fixture({
    read: async (_key, goal) => {
      if (delay) {
        delay = false;
        return delayed.promise;
      }
      return response(goal, {
        timeZone: zone,
        days: goal
          ? weekDates(asOf, zone).map((date, index) => ({ date, completed: index === 6 ? 2 : 0 }))
          : [],
      });
    },
  });
  store.setAccount('A');
  await store.refresh();
  await store.select('g1');
  delay = true;
  const old = store.refresh();
  await flush();
  zone = 'UTC';
  store.setTimeZone(zone);
  assert.equal(store.getSnapshot().overview, null);
  await store.refresh();
  delayed.resolve(response('g1'));
  await old;
  assert.equal(store.getSnapshot().selectedGoalId, 'g1');
  assert.equal(store.getSnapshot().overview.timeZone, 'UTC');
  assert.equal(store.getSnapshot().overview.days[6].date, '2026-03-09');
});

test('zone change during selection hydration preserves that account selection', async () => {
  const hydration = deferred();
  const { store } = fixture({
    loadSelection: () => hydration.promise,
    read: async (_key, goal) =>
      response(goal, {
        timeZone: 'UTC',
        days: weekDates(asOf, 'UTC').map((date, index) => ({
          date,
          completed: index === 6 ? 2 : 0,
        })),
      }),
  });
  store.setAccount('A');
  const old = store.refresh();
  await flush();
  store.setTimeZone('UTC');
  const current = store.refresh();
  hydration.resolve('g1');
  await Promise.all([old, current]);
  assert.equal(store.getSnapshot().selectedGoalId, 'g1');
  assert.equal(store.getSnapshot().overview.timeZone, 'UTC');
});

test('changing time zone during completion keeps the mutation lock until the response arrives', async () => {
  const pending = deferred();
  let zone = 'America/New_York';
  let writes = 0;
  const { store } = fixture({
    complete: async () => {
      writes++;
      await pending.promise;
    },
    read: async (_key, goal) =>
      response(goal, {
        timeZone: zone,
        days: goal
          ? weekDates(asOf, zone).map((date, index) => ({ date, completed: index === 6 ? 2 : 0 }))
          : [],
      }),
  });
  store.setAccount('A');
  await store.refresh();
  await store.select('g1');
  const completing = store.complete();
  zone = 'UTC';
  store.setTimeZone(zone);
  await store.refresh();
  await store.complete();
  assert.equal(store.getSnapshot().completing, true);
  assert.equal(writes, 1);
  pending.resolve();
  await completing;
  assert.equal(store.getSnapshot().completing, false);
  assert.equal(store.getSnapshot().overview.timeZone, 'UTC');
});

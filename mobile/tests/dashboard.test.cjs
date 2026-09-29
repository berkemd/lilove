const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function loadSource(relative, imports = {}, globals = {}) {
  const filename = path.join(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), source)(
    (name) => {
      assert(name in imports, `Unexpected dependency: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    ...Object.values(globals)
  );
  return module.exports;
}

const dashboard = loadSource('src/lib/dashboard.ts');
const { loadDashboardStats } = dashboard;
const page = (totalCount = 137) => ({
  tasks: totalCount ? [{ id: 'done', status: 'completed' }] : [],
  totalCount,
  currentPage: 1,
  totalPages: totalCount,
});
const apiFixture = (overrides = {}) => ({
  getGoals: async () => [{ status: 'active' }, { status: 'completed' }],
  getCompletedTasks: async () => page(),
  getHabits: async () => [{ currentStreak: 3 }, { currentStreak: 2 }],
  ...overrides,
});

test('dashboard reads the filtered total, not the page size or absent completed boolean', async () => {
  assert.deepEqual(await loadDashboardStats(apiFixture()), {
    activeGoals: 1,
    completedTasks: 137,
    totalHabits: 2,
    streaks: 5,
  });
});

test('a verified empty task page can show zero', async () => {
  const stats = await loadDashboardStats(apiFixture({ getCompletedTasks: async () => page(0) }));
  assert.equal(stats.completedTasks, 0);
});

test('legacy arrays, malformed counts and unfiltered responses cannot become false progress', async () => {
  for (const response of [
    null,
    [],
    { tasks: [{ completed: true }], totalCount: 1 },
    { ...page(), totalCount: undefined },
    { ...page(), totalCount: '137' },
    { ...page(), totalCount: -1 },
    { ...page(), totalCount: NaN },
    { ...page(), totalCount: 1.5 },
    { ...page(), totalCount: 0 },
    { ...page(), tasks: [] },
    { ...page(), tasks: [{ status: 'pending' }] },
  ]) {
    await assert.rejects(
      loadDashboardStats(apiFixture({ getCompletedTasks: async () => response })),
      /Invalid dashboard response/
    );
  }
});

test('each failed or malformed stats source rejects instead of returning zero', async () => {
  for (const method of ['getGoals', 'getCompletedTasks', 'getHabits']) {
    await assert.rejects(
      loadDashboardStats(
        apiFixture({ [method]: async () => Promise.reject(new Error('offline')) })
      ),
      /offline/
    );
    await assert.rejects(
      loadDashboardStats(apiFixture({ [method]: async () => null })),
      /Invalid dashboard response/
    );
  }
});

test('actual API sends status=completed and uses only one result to obtain the complete count', async () => {
  const calls = [];
  const { api } = loadSource(
    'src/lib/api.ts',
    {
      'expo-constants': { default: { expoConfig: { extra: { apiUrl: 'https://test.invalid' } } } },
      '../services/tokenManager': { tokenManager: { getToken: async () => 'test-token' } },
      './demoData': { DEMO_TOKEN: 'demo' },
      '../i18n': { t: (key) => key },
      './habits': { createHabitsApi: () => ({}) },
    },
    {
      console: { log() {} },
      fetch: async (url) => {
        calls.push(url);
        return { ok: true, json: async () => page() };
      },
    }
  );
  assert.deepEqual(await api.getCompletedTasks(), page());
  assert.deepEqual(calls, ['https://test.invalid/api/tasks?status=completed&limit=1']);
});

test('demo tasks follow the real status, filtered count and pagination contract after completion', async () => {
  const demo = loadSource(
    'src/lib/demoData.ts',
    { '../i18n': { t: (key) => key } },
    {
      URLSearchParams: class {
        constructor() {
          assert.fail('React Native does not support URLSearchParams string parsing or get()');
        }
      },
    }
  );
  const first = demo.demoCevap('GET', '/api/tasks?status=completed&limit=1');
  assert.equal(first.totalCount, 1);
  assert.equal(first.tasks[0].status, 'completed');
  assert.equal('completed' in first.tasks[0], false);
  assert.equal(demo.demoCevap('GET', '/api/tasks?limit=1&offset=1').currentPage, 2);
  demo.demoCevap('POST', '/api/tasks/t1/complete');
  const after = demo.demoCevap('GET', '/api/tasks?status=completed&limit=1');
  assert.equal(after.totalCount, 2);
  assert.equal(after.tasks.length, 1);
  assert.equal(after.totalPages, 2);
  assert.equal(typeof after.tasks[0].completedAt, 'string');
  const stats = await loadDashboardStats({
    getGoals: async () => demo.demoCevap('GET', '/api/goals'),
    getCompletedTasks: async () => after,
    getHabits: async () => demo.demoCevap('GET', '/api/habits'),
  });
  assert.equal(stats.completedTasks, 2);
});

test('actual dashboard hides stats on refresh failure, offers retry and restores verified counts', async () => {
  const state = [];
  let cursor = 0;
  let focus;
  const navigated = [];
  let offline = false;
  let balance = 1000;
  let balanceRefreshes = 0;
  const createElement = (type, props) => ({ type, props });
  const api = apiFixture({
    getCompletedTasks: async () => {
      if (offline) throw new Error('private backend detail');
      return page();
    },
  });
  const native = Object.fromEntries(
    ['View', 'Text', 'ScrollView', 'TouchableOpacity', 'RefreshControl'].map((name) => [name, name])
  );
  const Screen = loadSource('src/screens/dashboard/DashboardScreen.tsx', {
    react: {
      useCallback: (callback) => callback,
      useState: (initial) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (value) => (state[index] = value)];
      },
    },
    'react/jsx-runtime': { jsx: createElement, jsxs: createElement },
    'react-native': { ...native, StyleSheet: { create: (styles) => styles } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '@react-navigation/native': {
      useFocusEffect: (callback) => (focus = callback),
      useNavigation: () => ({ navigate: (route) => navigated.push(route) }),
    },
    '../../hooks/useDailyFocus': { refreshDailyFocus: async () => {} },
    '../../components/DailyFocusCard': { default: 'DailyFocusCard' },
    '../../store/authStore': {
      useAuthStore: () => ({ user: {}, userProfile: { coinBalance: 100 } }),
    },
    '../../hooks/useCoinBalance': {
      useCoinBalance: () => ({
        balance,
        refresh: async () => {
          balanceRefreshes++;
          return balance;
        },
      }),
    },
    '../../lib/api': { api },
    '../../lib/dashboard': dashboard,
    '../../components/MoodSelector': { default: 'MoodSelector' },
    '../../i18n': { t: (key) => key },
    '../../theme/ThemeProvider': {
      useTheme: () => ({ color: (value) => value }),
      useThemedStyles: (styles) => styles,
    },
  }).default;
  const render = () => {
    cursor = 0;
    return Screen();
  };
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return undefined;
    if (predicate(node)) return node;
    return Object.values(node)
      .map((value) => find(value, predicate))
      .find(Boolean);
  };
  const flush = () => new Promise(setImmediate);
  render();
  focus();
  await flush();
  let tree = render();
  find(tree, (node) => node.props?.testID === 'button-open-tasks').props.onPress();
  assert.deepEqual(navigated, ['Tasks']);
  assert(
    find(
      find(tree, (node) => node.props?.testID === 'button-open-tasks'),
      (node) => node.props?.name === 'chevron-forward'
    )
  );
  assert(find(tree, (node) => node.type === 'Text' && node.props.children === 137));
  assert(
    find(
      tree,
      (node) => node.type === 'Text' && JSON.stringify(node.props.children) === '[1000," Coins"]'
    )
  );
  balance = null;
  tree = render();
  assert(
    find(
      tree,
      (node) => node.type === 'Text' && JSON.stringify(node.props.children) === '["—"," Coins"]'
    )
  );
  offline = true;
  find(tree, (node) => node.type === 'RefreshControl').props.onRefresh();
  await flush();
  tree = render();
  assert.equal(balanceRefreshes, 1);
  const retry = find(tree, (node) => node.props?.['data-testid'] === 'button-retry-dashboard');
  assert(retry);
  assert.equal(
    find(tree, (node) => node.type === 'Text' && node.props.children === 137),
    undefined
  );
  assert.equal(JSON.stringify(tree).includes('private backend detail'), false);
  offline = false;
  await retry.props.onPress();
  tree = render();
  assert(find(tree, (node) => node.type === 'Text' && node.props.children === 137));
});

function findTree(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  return Object.values(node)
    .map((value) => findTree(value, predicate))
    .find(Boolean);
}

function mountTasks(api) {
  const state = [];
  let cursor = 0;
  let effect;
  const react = {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [
        state[index],
        (value) => (state[index] = typeof value === 'function' ? value(state[index]) : value),
      ];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in state)) state[index] = { current: initial };
      return state[index];
    },
    useEffect: (callback) => (effect = callback),
  };
  const native = Object.fromEntries(
    [
      'View',
      'Text',
      'ScrollView',
      'TouchableOpacity',
      'TextInput',
      'Modal',
      'SafeAreaView',
      'ActivityIndicator',
      'RefreshControl',
    ].map((name) => [name, name])
  );
  const createElement = (type, props, key) => ({ type, props, key });
  const Screen = loadSource('src/screens/tasks/TasksScreen.tsx', {
    react: { ...react, default: react },
    'react/jsx-runtime': { jsx: createElement, jsxs: createElement, Fragment: 'Fragment' },
    'react-native': {
      ...native,
      StyleSheet: { create: (styles) => styles },
      Alert: { alert() {} },
    },
    '@react-navigation/native': {
      useNavigation: () => ({ addListener: () => () => {}, navigate() {} }),
    },
    '../../hooks/useDailyFocus': { refreshDailyFocus: async () => {} },
    '../../components/DailyFocusCard': { default: 'DailyFocusCard' },
    '../../store/authStore': {
      useAuthStore: {
        getState: () => ({ user: { uid: 'reader' }, isAuthenticated: true }),
        subscribe: () => () => {},
      },
    },
    '../../lib/api': { api: { getGoals: async () => [], ...api } },
    '../../i18n': { t: (key) => key },
    '../../theme/ThemeProvider': {
      useTheme: () => ({ color: (value) => value }),
      useThemedStyles: (styles) => styles,
    },
  }).default;
  const render = () => {
    cursor = 0;
    return Screen();
  };
  const initialTree = render();
  effect();
  return { render, initialTree };
}

test('actual Tasks screen unwraps a partial page and treats server status as authoritative', async () => {
  const screen = mountTasks({
    getTasks: async () => ({
      tasks: [
        { id: 'done', title: 'Finished record', status: 'completed', completed: false },
        { id: 'todo', title: 'Pending record', status: 'pending', completed: true },
      ],
      totalCount: 75,
      currentPage: 1,
      totalPages: 38,
    }),
  });
  assert(findTree(screen.initialTree, (node) => node.type === 'ActivityIndicator'));
  assert.equal(
    findTree(screen.initialTree, (node) => node.props?.children === 'no_tasks_yet'),
    undefined
  );
  await new Promise(setImmediate);
  const tree = screen.render();
  assert(findTree(tree, (node) => node.props?.children === 'Finished record'));
  assert(findTree(tree, (node) => node.props?.children === 'Pending record'));
  assert.equal(findTree(tree, (node) => node.key === 'done').props.disabled, true);
  assert.equal(findTree(tree, (node) => node.key === 'todo').props.disabled, false);
  assert.equal(
    findTree(tree, (node) => node.props?.testID === 'button-retry-tasks'),
    undefined
  );
});

test('actual Tasks screen displays demo records and refreshes their completed status', async () => {
  const demo = loadSource('src/lib/demoData.ts', { '../i18n': { t: (key) => key } });
  const screen = mountTasks({
    getTasks: async () => demo.demoCevap('GET', '/api/tasks'),
    completeTask: async (id) => demo.demoCevap('POST', `/api/tasks/${id}/complete`),
  });
  await new Promise(setImmediate);
  let tree = screen.render();
  assert(findTree(tree, (node) => node.props?.children === 'book_the_dentist'));
  assert.equal(findTree(tree, (node) => node.key === 't1').props.disabled, false);
  assert.equal(findTree(tree, (node) => node.key === 't2').props.disabled, true);
  await findTree(tree, (node) => node.key === 't1').props.onPress();
  await new Promise(setImmediate);
  tree = screen.render();
  assert.equal(findTree(tree, (node) => node.key === 't1').props.disabled, true);
});

test('task read failure or malformed response shows retry, never a successful empty list', async () => {
  for (const response of [
    new Error('private backend detail'),
    null,
    [],
    { tasks: [], totalCount: 8 },
    { tasks: [], totalCount: -1 },
    { tasks: [{ id: 'old', title: 'Legacy boolean', completed: true }], totalCount: 1 },
  ]) {
    let failed = true;
    const screen = mountTasks({
      getTasks: async () => {
        if (!failed) return { tasks: [], totalCount: 0, currentPage: 1, totalPages: 0 };
        if (response instanceof Error) throw response;
        return response;
      },
    });
    await new Promise(setImmediate);
    let tree = screen.render();
    const retry = findTree(tree, (node) => node.props?.testID === 'button-retry-tasks');
    assert(retry);
    assert.equal(
      findTree(tree, (node) => node.props?.children === 'no_tasks_yet'),
      undefined
    );
    assert.equal(JSON.stringify(tree).includes('private backend detail'), false);
    failed = false;
    await retry.props.onPress();
    tree = screen.render();
    assert.equal(
      findTree(tree, (node) => node.props?.testID === 'button-retry-tasks'),
      undefined
    );
    assert(findTree(tree, (node) => node.props?.children === 'no_tasks_yet'));
  }
});

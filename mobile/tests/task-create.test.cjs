const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');
const flush = () => new Promise(setImmediate);
function load(relative, imports) {
  const file = path.join(__dirname, '..', relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => {
      assert(name in imports, `Unexpected import ${name}`);
      return imports[name];
    },
    module,
    module.exports
  );
  return module.exports;
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  return Object.values(node)
    .map((value) => find(value, predicate))
    .find(Boolean);
}
const byId = (tree, id) => find(tree, (node) => node.props?.testID === id);
const input = (tree, key) => find(tree, (node) => node.props?.placeholder === key);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const active = (id = 'goal-a', title = 'Actual goal') => ({ id, title, status: 'active' });
function mount(overrides = {}, options = {}) {
  const values = [],
    effects = [],
    dependencies = [],
    cleanups = [];
  let cursor = 0,
    effectCursor = 0;
  const listeners = new Set(),
    focus = new Set(),
    calls = [],
    alerts = [],
    navigated = [];
  let account = { user: { uid: 'a' }, isDemo: false, isAuthenticated: true };
  const store = Object.assign(() => account, {
    getState: () => account,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  });
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial;
      return [
        values[i],
        (v) => {
          values[i] = typeof v === 'function' ? v(values[i]) : v;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in values)) values[i] = { current: initial };
      return values[i];
    },
    useCallback: (fn) => fn,
    useEffect(fn, deps) {
      const i = effectCursor++;
      if (!dependencies[i] || !deps || deps.some((v, j) => v !== dependencies[i][j]))
        effects.push(() => {
          cleanups[i]?.();
          cleanups[i] = fn();
        });
      dependencies[i] = deps;
    },
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
      'KeyboardAvoidingView',
    ].map((name) => [name, name])
  );
  const navigation = {
    navigate: (...args) => navigated.push(args),
    goBack: () => navigated.push(['back']),
    addListener: (event, fn) => {
      assert.equal(event, 'focus');
      focus.add(fn);
      return () => focus.delete(fn);
    },
  };
  const api = {
    getTasks: async () => ({ tasks: [], totalCount: 0 }),
    getGoals: async () => [active()],
    createTask: async (body) => {
      calls.push(body);
      return { id: 'task', ...body };
    },
    createGoal: async (body) => {
      calls.push(body);
      return { id: 'new-goal', ...body };
    },
    ...overrides,
  };
  const element = (type, props, key) => ({ type, props, key });
  const catalog = options.locale ? load(`src/i18n/${options.locale}.ts`, {})[options.locale] : null;
  const imports = {
    react: { ...react, default: react },
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
    'react-native': {
      ...native,
      Platform: { OS: options.os || 'ios' },
      StyleSheet: { create: (v) => v },
      Alert: { alert: (...args) => alerts.push(args) },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '@react-navigation/native': { useNavigation: () => navigation },
    '../../store/authStore': { useAuthStore: store },
    '../../lib/api': { api },
    '../../i18n': {
      t: (key) => {
        if (!catalog) return key;
        assert(catalog[key], `Missing ${options.locale}.${key}`);
        return catalog[key];
      },
    },
    '../../theme/ThemeProvider': {
      useTheme: () => ({ color: (v) => v }),
      useThemedStyles: (v) => v,
    },
  };
  const Screen = load(options.source || 'src/screens/tasks/TasksScreen.tsx', imports).default;
  const render = () => {
    cursor = 0;
    effectCursor = 0;
    const tree = Screen({ navigation, route: options.route });
    effects.splice(0).forEach((fn) => fn());
    return tree;
  };
  render();
  return {
    render,
    calls,
    alerts,
    navigated,
    focus: () => focus.forEach((fn) => fn()),
    switchAccount: (uid) => {
      account = { ...account, user: { uid } };
      listeners.forEach((fn) => fn(account));
      render();
    },
    stop: () => cleanups.forEach((fn) => fn?.()),
    api,
  };
}
async function open(h) {
  await flush();
  byId(h.render(), 'button-new-task').props.onPress();
  await flush();
}
function draft(h) {
  input(h.render(), 'task_title').props.onChangeText('  My task  ');
  input(h.render(), 'description_optional').props.onChangeText('  User detail  ');
}

test('rendered task form requires explicit active goal and sends the actual goal ID with valid server fields', async () => {
  const h = mount({ getGoals: async () => [active(), { ...active('paused'), status: 'paused' }] });
  await open(h);
  draft(h);
  assert.equal(byId(h.render(), 'task-goal-paused'), undefined);
  assert.equal(byId(h.render(), 'button-save-task').props.disabled, true);
  await byId(h.render(), 'button-save-task').props.onPress();
  assert.equal(h.calls.length, 0);
  byId(h.render(), 'task-goal-goal-a').props.onPress();
  await byId(h.render(), 'button-save-task').props.onPress();
  assert.deepEqual(h.calls, [
    {
      title: 'My task',
      description: 'User detail',
      goalId: 'goal-a',
      priority: 'medium',
      status: 'pending',
    },
  ]);
});

test('no active goals opens the real goal form and restores the task draft when returning', async () => {
  let goals = [];
  const h = mount({ getGoals: async () => goals });
  await open(h);
  draft(h);
  byId(h.render(), 'button-create-task-goal').props.onPress();
  assert.deepEqual(h.navigated, [], 'iOS must finish dismissing the task modal before navigating');
  find(h.render(), (n) => n.type === 'Modal').props.onDismiss();
  assert.deepEqual(h.navigated, [['TaskGoal', { createForTask: true }]]);
  const form = mount(
    {},
    { source: 'src/screens/goals/GoalsScreen.tsx', route: { params: { createForTask: true } } }
  );
  assert.equal(find(form.render(), (n) => n.type === 'Modal').props.visible, true);
  find(form.render(), (n) => n.props?.['data-testid'] === 'input-goal-title').props.onChangeText(
    'Created goal'
  );
  await find(form.render(), (n) => n.props?.['data-testid'] === 'button-save-goal').props.onPress();
  assert.deepEqual(form.navigated, []);
  find(form.render(), (n) => n.type === 'Modal').props.onDismiss();
  assert.deepEqual(form.navigated, [['back']]);
  goals = [active('new-goal', 'Created goal')];
  h.focus();
  await flush();
  assert.equal(find(h.render(), (n) => n.type === 'Modal').props.visible, true);
  assert.equal(input(h.render(), 'task_title').props.value, '  My task  ');
  assert(byId(h.render(), 'task-goal-new-goal'));
  assert.equal(byId(h.render(), 'button-save-task').props.disabled, true);
});

test('failed or malformed goal reads preserve draft and cannot masquerade as no goals; retry recovers', async () => {
  for (const response of [
    new Error('private detail'),
    null,
    {},
    [{ id: 'bad', title: 'Bad', status: 'unknown' }],
  ]) {
    let fail = true;
    const h = mount({
      getGoals: async () => {
        if (!fail) return [active()];
        if (response instanceof Error) throw response;
        return response;
      },
    });
    await open(h);
    draft(h);
    assert(byId(h.render(), 'button-retry-task-goals'));
    assert.equal(byId(h.render(), 'button-create-task-goal'), undefined);
    assert.equal(JSON.stringify(h.render()).includes('private detail'), false);
    await byId(h.render(), 'button-save-task').props.onPress();
    assert.equal(h.calls.length, 0);
    fail = false;
    await byId(h.render(), 'button-retry-task-goals').props.onPress();
    assert.equal(input(h.render(), 'task_title').props.value, '  My task  ');
    assert(byId(h.render(), 'task-goal-goal-a'));
  }
});

test('submit failure keeps the selected goal and draft; simultaneous presses cannot repeat a write', async () => {
  const pending = deferred();
  let writes = 0;
  const h = mount({
    createTask: async () => {
      writes++;
      return pending.promise;
    },
  });
  await open(h);
  draft(h);
  byId(h.render(), 'task-goal-goal-a').props.onPress();
  const submit = byId(h.render(), 'button-save-task').props.onPress;
  const saving = submit();
  await submit();
  assert.equal(writes, 1);
  assert.equal(byId(h.render(), 'button-save-task').props.disabled, true);
  pending.reject({ outcomeUnknown: true });
  await saving;
  assert.deepEqual(h.alerts.at(-1), ['error', 'request_outcome_unknown']);
  assert.equal(input(h.render(), 'task_title').props.value, '  My task  ');
  assert.equal(input(h.render(), 'description_optional').props.value, '  User detail  ');
  assert.equal(byId(h.render(), 'task-goal-goal-a').props.accessibilityState.checked, true);
  assert.equal(find(h.render(), (n) => n.type === 'Modal').props.visible, true);
});

test('a removed or paused selection cannot be submitted after the goal list refreshes', async () => {
  let choices = [active()];
  const h = mount({ getGoals: async () => choices });
  await open(h);
  draft(h);
  byId(h.render(), 'task-goal-goal-a').props.onPress();
  choices = [{ ...active(), status: 'paused' }];
  h.focus();
  await flush();
  await byId(h.render(), 'button-save-task').props.onPress();
  assert.equal(h.calls.length, 0);
  assert.equal(input(h.render(), 'task_title').props.value, '  My task  ');
  assert(byId(h.render(), 'button-create-task-goal'));
});

test('account switching clears the old draft and ignores a late create result, including return to the same UID', async () => {
  const pending = deferred();
  const h = mount({ createTask: async () => pending.promise });
  await open(h);
  draft(h);
  byId(h.render(), 'task-goal-goal-a').props.onPress();
  const saved = byId(h.render(), 'button-save-task').props.onPress();
  h.switchAccount('b');
  h.switchAccount('a');
  await flush();
  assert.equal(input(h.render(), 'task_title').props.value, '');
  assert.equal(find(h.render(), (n) => n.type === 'Modal').props.visible, false);
  pending.resolve({ id: 'late-task' });
  await saved;
  assert.deepEqual(h.alerts, []);
  assert.equal(byId(h.render(), 'task-goal-goal-a').props.accessibilityState.checked, false);
});

test('late old-account goal reads cannot replace the current account choices', async () => {
  const pending = deferred();
  let read = 0;
  const h = mount({
    getGoals: async () => (++read === 1 ? pending.promise : [active('goal-b', 'B goal')]),
  });
  h.switchAccount('b');
  await flush();
  pending.resolve([active('goal-a', 'A private goal')]);
  await flush();
  assert(byId(h.render(), 'task-goal-goal-b'));
  assert.equal(byId(h.render(), 'task-goal-goal-a'), undefined);
  assert.equal(JSON.stringify(h.render()).includes('A private goal'), false);
});

test('canceling goal creation returns to Tasks without creating a goal; switching account invalidates the form', async () => {
  const h = mount(
    {},
    { source: 'src/screens/goals/GoalsScreen.tsx', route: { params: { createForTask: true } } }
  );
  find(h.render(), (n) => n.type === 'Modal').props.onRequestClose();
  assert.deepEqual(h.navigated, []);
  find(h.render(), (n) => n.type === 'Modal').props.onDismiss();
  assert.deepEqual(h.navigated, [['back']]);
  assert.deepEqual(h.calls, []);
  const other = mount(
    {},
    { source: 'src/screens/goals/GoalsScreen.tsx', route: { params: { createForTask: true } } }
  );
  other.switchAccount('b');
  find(other.render(), (n) => n.props?.['data-testid'] === 'input-goal-title').props.onChangeText(
    'Old draft'
  );
  await find(
    other.render(),
    (n) => n.props?.['data-testid'] === 'button-save-goal'
  ).props.onPress();
  assert.deepEqual(other.navigated, []);
  find(other.render(), (n) => n.type === 'Modal').props.onDismiss();
  assert.deepEqual(other.navigated, [['back']]);
  assert.deepEqual(other.calls, []);
});

test('the demo goal and task response supports the same explicit goal selection and payload', async () => {
  const demo = load('src/lib/demoData.ts', { '../i18n': { t: (key) => key } });
  const h = mount({
    getGoals: async () => demo.demoCevap('GET', '/api/goals'),
    getTasks: async () => demo.demoCevap('GET', '/api/tasks'),
    createTask: async (body) => demo.demoCevap('POST', '/api/tasks', body),
  });
  await open(h);
  draft(h);
  const goal = demo.demoCevap('GET', '/api/goals').find((value) => value.status === 'active');
  byId(h.render(), `task-goal-${goal.id}`).props.onPress();
  await byId(h.render(), 'button-save-task').props.onPress();
  const saved = demo.demoCevap('GET', '/api/tasks').tasks.find((task) => task.title === 'My task');
  assert.equal(saved.goalId, goal.id);
  assert.equal(saved.status, 'pending');
});

test('all seven locales have the narrow reviewed goal selection instructions', () => {
  for (const locale of ['en', 'de', 'fr', 'es', 'it', 'ja', 'tr']) {
    const copy = load(`src/i18n/${locale}.ts`, {})[locale];
    assert.equal(typeof copy.task_select_goal, 'string');
    assert(copy.task_select_goal.length > 0);
    assert.equal(typeof copy.task_no_active_goals, 'string');
    assert(copy.task_no_active_goals.length > 0);
  }
});

test('failed goal creation keeps its form open and preserves text; late success after account change cannot pop another screen', async () => {
  const pending = deferred();
  const h = mount(
    {
      createGoal: async () => {
        throw { outcomeUnknown: true };
      },
    },
    { source: 'src/screens/goals/GoalsScreen.tsx', route: { params: { createForTask: true } } }
  );
  const goalTitle = (tree) => find(tree, (n) => n.props?.['data-testid'] === 'input-goal-title');
  const save = (tree) => find(tree, (n) => n.props?.['data-testid'] === 'button-save-goal');
  goalTitle(h.render()).props.onChangeText('User goal draft');
  await save(h.render()).props.onPress();
  assert.equal(goalTitle(h.render()).props.value, 'User goal draft');
  assert.deepEqual(h.navigated, []);
  assert.deepEqual(h.alerts.at(-1), ['error', 'request_outcome_unknown']);
  const other = mount(
    { createGoal: async () => pending.promise },
    { source: 'src/screens/goals/GoalsScreen.tsx', route: { params: { createForTask: true } } }
  );
  goalTitle(other.render()).props.onChangeText('A goal');
  const creating = save(other.render()).props.onPress();
  other.switchAccount('b');
  pending.resolve({ id: 'old-goal' });
  await creating;
  assert.deepEqual(other.navigated, []);
  find(other.render(), (n) => n.type === 'Modal').props.onDismiss();
  assert.deepEqual(other.navigated, [['back']]);
  assert.deepEqual(other.alerts, []);
});

test('all seven locales render priorities and task statuses while submits keep the backend identifiers', async () => {
  for (const locale of ['en', 'de', 'fr', 'es', 'it', 'ja', 'tr']) {
    const copy = load(`src/i18n/${locale}.ts`, {})[locale];
    const h = mount(
      {
        getTasks: async () => ({
          tasks: [
            { id: 'pending', title: 'Pending item', status: 'pending', priority: 'low' },
            { id: 'active', title: 'Active item', status: 'active', priority: 'medium' },
            { id: 'done', title: 'Done item', status: 'completed', priority: 'high' },
          ],
          totalCount: 3,
        }),
      },
      { locale }
    );
    await open(h);
    for (const key of [
      'task_priority_low',
      'task_priority_medium',
      'task_priority_high',
      'task_priority_urgent',
      'task_status_pending',
      'goal_status_active',
      'completed',
    ]) {
      assert(JSON.stringify(h.render()).includes(copy[key]), `${locale}.${key} must render`);
    }
    for (const key of ['task_status_skipped', 'task_status_blocked', 'task_status_cancelled'])
      assert(copy[key]);
    input(h.render(), copy.task_title).props.onChangeText('Real title');
    byId(h.render(), 'task-goal-goal-a').props.onPress();
    find(
      h.render(),
      (n) =>
        n.type === 'TouchableOpacity' &&
        n.props.children?.props?.children === copy.task_priority_urgent
    ).props.onPress();
    await byId(h.render(), 'button-save-task').props.onPress();
    assert.equal(h.calls[0].priority, 'urgent');
    assert.equal(h.calls[0].status, 'pending');
  }
});

test('Android goal navigation does not wait for the iOS-only modal dismissal callback', async () => {
  const h = mount({ getGoals: async () => [] }, { os: 'android' });
  await open(h);
  byId(h.render(), 'button-create-task-goal').props.onPress();
  assert.deepEqual(h.navigated, [['TaskGoal', { createForTask: true }]]);
  const form = mount(
    {},
    {
      os: 'android',
      source: 'src/screens/goals/GoalsScreen.tsx',
      route: { params: { createForTask: true } },
    }
  );
  find(form.render(), (n) => n.type === 'Modal').props.onRequestClose();
  assert.deepEqual(form.navigated, [['back']]);
});

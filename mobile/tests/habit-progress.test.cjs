const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function loadSource(relative, imports = {}, globals = {}) {
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
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
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
const progress = loadSource('src/lib/habitProgress.ts');
const { summarizeHabitProgress } = progress;
const habits = loadSource('src/lib/habits.ts');
const sample = (extra = {}) => ({
  id: 'walk',
  title: 'Walk',
  category: 'health',
  completedToday: false,
  ...extra,
});
const flush = () => new Promise(setImmediate);
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  return Object.values(node)
    .map((child) => find(child, predicate))
    .find(Boolean);
}
const jsx = (type, props) => ({ type, props });
const theme = {
  useTheme: () => ({ isDark: false, color: (color) => color }),
  useThemedStyles: (styles) => styles,
};
const catalog = loadSource('src/i18n/en.ts').en;
const i18n = {
  t: (key) => {
    assert.equal(typeof catalog[key], 'string', `Missing ${key}`);
    return catalog[key];
  },
};
const native = {
  ...Object.fromEntries(
    [
      'View',
      'Text',
      'ScrollView',
      'TouchableOpacity',
      'TextInput',
      'Modal',
      'ActivityIndicator',
      'RefreshControl',
      'KeyboardAvoidingView',
    ].map((name) => [name, name])
  ),
  StyleSheet: { create: (styles) => styles },
  Platform: { OS: 'ios' },
  Alert: { alert() {} },
};

test('counts reflect only active, unpaused habits and strict completedToday flags', () => {
  const records = [
    sample({ id: 'one', completedToday: true }),
    sample({ id: 'two', completedToday: true }),
    sample({ id: 'three' }),
    sample({ id: 'inactive', isActive: false, completedToday: true }),
    sample({ id: 'paused', isPaused: true, completedToday: true }),
  ];
  assert.deepEqual(summarizeHabitProgress(records), {
    done: 2,
    total: 3,
    remaining: 1,
    ratio: 2 / 3,
  });
  assert.deepEqual(summarizeHabitProgress([]), { done: 0, total: 0, remaining: 0, ratio: 0 });
  assert.deepEqual(summarizeHabitProgress(records.slice(3)), {
    done: 0,
    total: 0,
    remaining: 0,
    ratio: 0,
  });
  assert.deepEqual(summarizeHabitProgress(records.slice(0, 2)), {
    done: 2,
    total: 2,
    remaining: 0,
    ratio: 1,
  });
  assert.equal(summarizeHabitProgress([sample({ completedToday: 'true' })]).done, 0);
});

test('real HabitTracker confirmation updates progress, and the next day resets it', async () => {
  let checked = false;
  const tracker = new habits.HabitTracker({
    getHabits: async () => [sample({ completedToday: checked })],
    trackHabit: async () => {
      checked = true;
      return sample({ completedToday: true });
    },
  });
  await tracker.refresh();
  assert.equal(summarizeHabitProgress(tracker.getSnapshot().habits).done, 0);
  await tracker.check('walk');
  assert.deepEqual(summarizeHabitProgress(tracker.getSnapshot().habits), {
    done: 1,
    total: 1,
    remaining: 0,
    ratio: 1,
  });
  checked = false;
  await tracker.refresh();
  assert.equal(summarizeHabitProgress(tracker.getSnapshot().habits).done, 0);
});

test('actual HabitsScreen hides progress while loading, on error and without visible habits', async () => {
  const states = [];
  let cursor = 0;
  let focus;
  let offline = false;
  let records = [sample()];
  let wait;
  const Screen = loadSource(
    'src/screens/habits/HabitsScreen.tsx',
    {
      react: {
        useCallback: (fn) => fn,
        useState(initial) {
          const index = cursor++;
          if (!(index in states))
            states[index] = typeof initial === 'function' ? initial() : initial;
          return [
            states[index],
            (value) => {
              states[index] = value;
            },
          ];
        },
        useSyncExternalStore: (_, read) => read(),
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-native': { ...native, AppState: { addEventListener: () => ({ remove() {} }) } },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      '@expo/vector-icons': { Ionicons: 'Ionicons' },
      '@react-navigation/native': {
        useFocusEffect: (fn) => {
          focus = fn;
        },
      },
      '../../lib/api': {
        api: {
          getHabits: async () => {
            if (wait) await wait;
            if (offline) throw new Error('offline');
            return records;
          },
        },
      },
      '../../lib/habits': habits,
      '../../lib/habitProgress': progress,
      '../../components/HabitProgressCard': { default: 'HabitProgressCard' },
      '../../i18n': i18n,
      '../../theme/ThemeProvider': theme,
    },
    { setInterval: () => 1, clearInterval() {} }
  ).default;
  const render = () => {
    cursor = 0;
    return Screen();
  };
  const card = () => find(render(), (node) => node.type === 'HabitProgressCard');
  assert.equal(card(), undefined);
  const cleanup = focus();
  await flush();
  assert.deepEqual(card().props, { done: 0, total: 1, remaining: 1, ratio: 0 });
  const gate = deferred();
  wait = gate.promise;
  const refresh = find(render(), (node) => node.type === 'RefreshControl').props.onRefresh;
  refresh();
  assert.equal(card(), undefined);
  gate.resolve();
  await flush();
  wait = undefined;
  offline = true;
  refresh();
  await flush();
  assert.equal(card(), undefined);
  assert(find(render(), (node) => node.props?.testID === 'retry-habits'));
  offline = false;
  records = [sample({ isPaused: true }), sample({ id: 'inactive', isActive: false })];
  refresh();
  await flush();
  assert.equal(card(), undefined);
  records = [sample({ completedToday: true })];
  refresh();
  await flush();
  assert.equal(card().props.done, 1);
  cleanup();
});

function mountCard() {
  const slots = [];
  const effects = [];
  const pending = [];
  let cursor = 0;
  let effectCursor = 0;
  const motion = deferred();
  const events = {};
  const controls = { focused: true, animations: [], stopped: 0, removed: 0 };
  const Card = loadSource('src/components/HabitProgressCard.tsx', {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [
          slots[index],
          (value) => {
            slots[index] = value;
          },
        ];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useEffect(callback, deps) {
        const index = effectCursor++;
        const old = effects[index];
        if (!old || deps.some((value, i) => value !== old.deps[i])) {
          pending.push(() => {
            old?.cleanup?.();
            effects[index] = { deps, cleanup: callback() };
          });
        }
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      ...native,
      AccessibilityInfo: {
        isReduceMotionEnabled: () => motion.promise,
        addEventListener: (_, fn) => {
          events.motion = fn;
          return {
            remove() {
              controls.removed++;
            },
          };
        },
      },
      AppState: {
        currentState: 'active',
        addEventListener: (_, fn) => {
          events.app = fn;
          return {
            remove() {
              controls.removed++;
            },
          };
        },
      },
      Animated: {
        View: 'Animated.View',
        Value: class {
          constructor(value) {
            this.value = value;
          }
          setValue(value) {
            this.value = value;
          }
          stopAnimation() {}
        },
        timing: (_, config) => config,
        sequence: (steps) => ({
          start() {
            controls.animations.push(steps);
          },
          stop() {
            controls.stopped++;
          },
        }),
      },
    },
    '@react-navigation/native': { useIsFocused: () => controls.focused },
    'react-native-svg': { default: 'Svg', Circle: 'Circle', Path: 'Path' },
    '../i18n': i18n,
    '../theme/ThemeProvider': theme,
  }).default;
  return {
    controls,
    events,
    motion,
    render(done = 0, total = 3) {
      cursor = 0;
      effectCursor = 0;
      const tree = Card({ done, total, remaining: total - done, ratio: done / total });
      pending.splice(0).forEach((effect) => effect());
      return tree;
    },
    unmount() {
      effects.forEach((effect) => effect?.cleanup?.());
    },
  };
}

test('ring has exact accessible values, a hidden decorative sprout and honest complete copy', () => {
  const card = mountCard();
  const tree = card.render(2, 3);
  const ring = find(tree, (node) => node.props?.testID === 'habit-progress-ring');
  assert.equal(ring.props.accessibilityRole, 'progressbar');
  assert.deepEqual(ring.props.accessibilityValue, {
    min: 0,
    max: 3,
    now: 2,
    text: '2 / 3 completed',
  });
  assert(ring.props.accessibilityLabel.includes(catalog.habits));
  assert(find(ring, (node) => node.props?.importantForAccessibility === 'no-hide-descendants'));
  const circle = find(
    tree,
    (node) => node.type === 'Circle' && node.props.strokeDashoffset !== undefined
  );
  assert.equal(circle.props.strokeDashoffset, 2 * Math.PI * 38 * (1 - 2 / 3));
  const allDone = card.render(3, 3);
  assert.equal(
    find(allDone, (node) => node.props?.testID === 'habit-progress-remaining').props.children,
    catalog.progress_today_complete
  );
  card.unmount();
});

test('animation starts only for a new completion and stops on blur/background or motion preference', async () => {
  const card = mountCard();
  card.render(0);
  card.render(1); // Safe default before the accessibility query resolves.
  assert.equal(card.controls.animations.length, 0);
  card.motion.resolve(false);
  await flush();
  card.render(1);
  assert.equal(card.controls.animations.length, 0);
  card.render(2);
  assert.equal(card.controls.animations.length, 1);
  assert(card.controls.animations[0].every((step) => step.useNativeDriver));
  assert.equal(
    card.controls.animations[0].reduce((sum, step) => sum + step.duration, 0),
    280
  );
  card.controls.focused = false;
  card.render(2);
  assert.equal(card.controls.stopped, 1);
  card.render(3);
  card.controls.focused = true;
  card.render(3);
  assert.equal(card.controls.animations.length, 1);
  card.render(0);
  card.events.app('background');
  card.render(1);
  card.events.app('active');
  card.render(1);
  assert.equal(card.controls.animations.length, 1);
  card.events.motion(true);
  card.render(2);
  assert.equal(card.controls.animations.length, 1);
  card.unmount();
  assert.equal(card.controls.removed, 2);
});

test('a newer Reduce Motion event wins over a late initial query response', async () => {
  const card = mountCard();
  card.render(0);
  card.events.motion(true);
  card.motion.resolve(false);
  await flush();
  card.render(1);
  assert.equal(card.controls.animations.length, 0);
  card.unmount();
});

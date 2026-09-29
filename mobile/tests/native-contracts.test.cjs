const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function loadSource(relative, imports = {}, globals = {}) {
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
      assert(name in imports, `Unexpected dependency: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    ...Object.values(globals)
  );
  return module.exports;
}

const userStats = loadSource('src/lib/userStats.ts');
const stats = (overrides = {}) => ({
  activeGoals: 6,
  completedGoals: 3,
  totalGoals: 9,
  streakCount: 12,
  longestStreak: 19,
  currentLevel: 7,
  totalXp: 2480,
  achievementsUnlocked: 3,
  performanceScore: '0',
  ...overrides,
});
const flush = () => new Promise(setImmediate);

function findTree(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  return Object.values(node)
    .map((value) => findTree(value, predicate))
    .find(Boolean);
}

const animatedOperation = () => ({ start() {}, stop() {} });
const native = {
  ...Object.fromEntries(
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
      'Image',
      'FlatList',
    ].map((name) => [name, name])
  ),
  StyleSheet: { create: (styles) => styles },
  Alert: { alert() {} },
  Linking: { openURL() {} },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Platform: { OS: 'ios', select: (options) => options.ios },
  PanResponder: { create: () => ({ panHandlers: {} }) },
  Animated: {
    View: 'Animated.View',
    Value: class {
      interpolate({ outputRange }) {
        return outputRange[0];
      }
      setValue() {}
    },
    timing: animatedOperation,
    spring: animatedOperation,
    loop: animatedOperation,
    sequence: animatedOperation,
    event: () => () => {},
  },
};

function mount(relative, imports = {}, props = {}) {
  const states = [];
  let cursor = 0;
  let effectCursor = 0;
  const effectDependencies = [];
  let focus;
  const effects = [];
  const navigated = [];
  const react = {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [
        states[index],
        (value) => {
          states[index] = typeof value === 'function' ? value(states[index]) : value;
        },
      ];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in states)) states[index] = { current: initial };
      return states[index];
    },
    useEffect: (callback, dependencies) => {
      const index = effectCursor++;
      const previous = effectDependencies[index];
      if (!dependencies || !previous || dependencies.some((value, i) => value !== previous[i])) {
        effects.push(callback);
      }
      effectDependencies[index] = dependencies;
    },
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
  };
  const createElement = (type, props, key) => ({ type, props, key });
  const Screen = loadSource(relative, {
    react: { ...react, default: react },
    'react/jsx-runtime': { jsx: createElement, jsxs: createElement, Fragment: 'Fragment' },
    'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '@react-navigation/native': {
      useFocusEffect: (callback) => {
        focus = callback;
      },
      useNavigation: () => ({
        navigate: (route) => navigated.push(route),
        addListener: () => () => {},
      }),
    },
    '../../store/authStore': {
      useAuthStore: Object.assign(() => ({ user: {}, userProfile: {} }), {
        getState: () => ({ user: { uid: 'reader' }, isAuthenticated: true }),
        subscribe: () => () => {},
      }),
    },
    '../../hooks/useCoinBalance': {
      useCoinBalance: () => ({
        balance: null,
        accountKey: 'user:test',
        refresh: async () => null,
        captureAccount: () => () => true,
      }),
    },
    '../../i18n': { t: (key) => key },
    '../../theme/ThemeProvider': {
      useTheme: () => ({ color: (value) => value, isDark: false }),
      useThemedStyles: (styles) => styles,
    },
    '../../lib/userStats': userStats,
    ...imports,
  }).default;
  const render = () => {
    cursor = 0;
    effectCursor = 0;
    const tree = Screen({ navigation: { navigate: (route) => navigated.push(route) }, ...props });
    return tree;
  };
  const initial = render();
  return {
    initial,
    render,
    navigated,
    focus: () => focus(),
    effects: () => effects.splice(0).forEach((run) => run()),
  };
}

function mountProfile(getUserStats, imports = {}) {
  return mount('src/screens/profile/ProfileScreen.tsx', {
    '../../lib/api': { default: { getUserStats } },
    '../../lib/subscriptionAvailability': { areNewSubscriptionsAvailable: () => false },
    '../../services/storage': { default: {} },
    'expo-image-picker': {},
    'expo-constants': { default: { expoConfig: { version: '1.2', ios: { buildNumber: '125' } } } },
    '../../hooks/useSubscription': { useSubscription: () => ({ status: 'loading' }) },
    ...imports,
  });
}

function mountAvatar(overrides = {}, imports = {}) {
  return mount('src/screens/avatar/AvatarScreen.tsx', {
    '../../lib/api': {
      api: {
        getUserStats: async () => stats(),
        getAvatarZones: async () => [],
        getMyTraits: async () => [],
        getMyEquipped: async () => [],
        getAvatar: async () => ({ health: 80, maxHealth: 100, mana: 40, maxMana: 50 }),
        ...overrides,
      },
    },
    '../../components/LivingForest': { default: 'LivingForest' },
    '../../components/AvatarPreview': { default: 'AvatarPreview' },
    '../../lib/avatarPreview': loadSource('src/lib/avatarPreview.ts'),
    ...imports,
  });
}

test('flat user stats are parsed without coercing missing, legacy or invalid data into progress', () => {
  assert.deepEqual(userStats.readUserStats(stats()), {
    totalGoals: 9,
    streakCount: 12,
    currentLevel: 7,
    totalXp: 2480,
  });
  assert.equal(userStats.readUserStats(stats({ totalXp: -5 })).totalXp, -5);
  for (const response of [
    null,
    {},
    { profile: stats() },
    stats({ currentLevel: 0 }),
    stats({ totalGoals: '9' }),
    stats({ totalXp: NaN }),
    stats({ streakCount: -1 }),
    stats({ totalXp: 1.5 }),
  ])
    assert.throws(() => userStats.readUserStats(response));
});

test('the actual stats API reads /api/user/stats and demo matches its flat contract', async () => {
  const calls = [];
  const { api } = loadSource(
    'src/lib/api.ts',
    {
      'expo-constants': { default: { expoConfig: { extra: { apiUrl: 'https://test.invalid' } } } },
      '../services/tokenManager': { tokenManager: { getToken: async () => 'account-token' } },
      './demoData': { DEMO_TOKEN: 'demo' },
      '../i18n': { t: (key) => key },
      './habits': { createHabitsApi: () => ({}) },
    },
    {
      console: { log() {} },
      fetch: async (url) => {
        calls.push(url);
        return { ok: true, json: async () => stats() };
      },
    }
  );
  assert.equal(userStats.readUserStats(await api.getUserStats()).currentLevel, 7);
  assert.deepEqual(calls, ['https://test.invalid/api/user/stats']);
  const demo = loadSource('src/lib/demoData.ts', { '../i18n': { t: (key) => key } });
  const response = demo.demoCevap('GET', '/api/user/stats');
  assert.equal('profile' in response, false);
  assert.equal(response.totalGoals, demo.demoCevap('GET', '/api/goals').length);
  assert.equal(userStats.readUserStats(response).currentLevel, demo.demoProfil().stats.level);
});

test('Profile shows real flat counts and its progress action targets the registered Home route', async () => {
  let response = stats();
  const screen = mountProfile(async () => response);
  screen.focus();
  await flush();
  let tree = screen.render();
  assert(findTree(tree, (node) => node.type === 'Text' && node.props.children === 12));
  assert(findTree(tree, (node) => node.type === 'Text' && node.props.children === 9));
  assert(
    findTree(tree, (node) => node.type === 'Text' && node.props.children === 'LiLove v1.2 (125)')
  );
  assert.equal(JSON.stringify(tree).includes('v1.0.0'), false);
  const action = findTree(
    tree,
    (node) => node.props?.['data-testid'] === 'button-menu-track_your_progress'
  );
  assert(action);
  action.props.onPress();
  assert.deepEqual(screen.navigated, ['Dashboard']);
  const app = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');
  assert.match(app, /name="Dashboard"\s+component=\{DashboardScreen\}/);
  assert.equal(
    findTree(tree, (node) => node.props?.children === 'analytics'),
    undefined
  );
  response = stats({ totalGoals: 10 });
  screen.focus();
  await flush();
  tree = screen.render();
  assert(findTree(tree, (node) => node.type === 'Text' && node.props.children === 10));
});

test('Profile read failure and malformed stats hide counts and recover only after a successful retry', async () => {
  for (const response of [new Error('private details'), null, { profile: stats() }]) {
    let failed = false;
    const screen = mountProfile(async () => {
      if (!failed) return stats();
      if (response instanceof Error) throw response;
      return response;
    });
    screen.focus();
    await flush();
    let tree = screen.render();
    failed = true;
    findTree(tree, (node) => node.type === 'RefreshControl').props.onRefresh();
    await flush();
    tree = screen.render();
    const retry = findTree(tree, (node) => node.props?.testID === 'button-retry-profile-stats');
    assert(retry);
    assert.equal(
      findTree(tree, (node) => node.type === 'Text' && node.props.children === 12),
      undefined
    );
    assert.equal(JSON.stringify(tree).includes('private details'), false);
    failed = false;
    await retry.props.onPress();
    tree = screen.render();
    assert(findTree(tree, (node) => node.type === 'Text' && node.props.children === 12));
  }
});

test('Avatar displays the server level instead of inventing level one from a missing profile wrapper', async () => {
  const screen = mountAvatar();
  screen.effects();
  await flush();
  const tree = screen.render();
  assert(
    findTree(
      tree,
      (node) => node.type === 'Text' && JSON.stringify(node.props.children) === '["level"," ",7]'
    )
  );
  assert.equal(
    findTree(tree, (node) => node.props?.['data-testid'] === 'button-retry'),
    undefined
  );
});

test('each Avatar read failure stays visible and retry restores the verified level', async () => {
  for (const method of [
    'getUserStats',
    'getAvatarZones',
    'getMyTraits',
    'getMyEquipped',
    'getAvatar',
  ]) {
    let failed = true;
    const fallback =
      method === 'getUserStats'
        ? stats()
        : method === 'getAvatar'
          ? { health: 80, maxHealth: 100, mana: 40, maxMana: 50 }
          : [];
    const screen = mountAvatar({
      [method]: async () => {
        if (failed) throw new Error('private details');
        return fallback;
      },
    });
    screen.effects();
    await flush();
    let tree = screen.render();
    const retry = findTree(tree, (node) => node.props?.['data-testid'] === 'button-retry');
    assert(retry);
    assert.equal(JSON.stringify(tree).includes('private details'), false);
    assert.equal(
      findTree(tree, (node) => node.props?.['data-testid'] === 'text-avatar-title'),
      undefined
    );
    failed = false;
    await retry.props.onPress();
    tree = screen.render();
    assert(
      findTree(
        tree,
        (node) => node.type === 'Text' && JSON.stringify(node.props.children) === '["level"," ",7]'
      )
    );
  }
});

test('Avatar rejects a legacy stats wrapper and malformed companion data', async () => {
  for (const override of [
    { getUserStats: async () => ({ profile: stats() }) },
    { getAvatar: async () => null },
    { getMyTraits: async () => null },
  ]) {
    const screen = mountAvatar(override);
    screen.effects();
    await flush();
    assert(findTree(screen.render(), (node) => node.props?.['data-testid'] === 'button-retry'));
  }
});

test('Growth Sanctuary visibly labels its fixed state as sample data and its Back action works', () => {
  const theme = loadSource('src/theme/LiLoveTheme.ts', { 'react-native': native });
  let wentBack = false;
  const screen = mount(
    'src/components/GrowthSanctuaryMobile.tsx',
    {
      'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
      '../theme/LiLoveTheme': theme,
      '../i18n': { t: (key) => key },
      '../theme/ThemeProvider': {
        useTheme: () => ({ isDark: false }),
        useThemedStyles: (styles) => styles,
      },
    },
    {
      navigation: {
        goBack: () => {
          wentBack = true;
        },
      },
    }
  );
  const banner = findTree(screen.initial, (node) => node.props?.testID === 'text-sanctuary-sample');
  assert.equal(banner.props.children, 'sample_data_nothing_is_saved_to_your_account');
  const back = findTree(
    screen.initial,
    (node) => node.type === 'TouchableOpacity' && typeof node.props.onPress === 'function'
  );
  back.props.onPress();
  assert.equal(wentBack, true);
});

function mountCoach(overrides = {}) {
  return mount('src/screens/coach/CoachScreen.tsx', {
    '../../lib/api': {
      api: {
        getCoachCapabilities: async () => ({ available: false, code: 'AI_UNAVAILABLE' }),
        getHabits: async () => [],
        getDailyInsight: async () => assert.fail('unexpected generation request'),
        getCoachResponse: async () => assert.fail('unexpected generation request'),
        ...overrides,
      },
    },
  });
}

test('closed Coach disables input and generation, keeps retry closed and opens real Goals', async () => {
  const screen = mountCoach();
  assert.equal(
    findTree(screen.initial, (node) => node.props?.['data-testid'] === 'input-coach-message').props
      .editable,
    false
  );
  screen.effects();
  await flush();
  let tree = screen.render();
  assert.equal(
    findTree(tree, (node) => node.props?.testID === 'text-coach-availability').props.children,
    'coach_unavailable'
  );
  assert.equal(
    findTree(tree, (node) => node.props?.['data-testid'] === 'input-coach-message').props.editable,
    false
  );
  const send = findTree(tree, (node) => node.props?.['data-testid'] === 'button-send-message');
  assert.equal(send.props.disabled, true);
  await send.props.onPress();
  await findTree(tree, (node) => node.props?.testID === 'button-retry-coach').props.onPress();
  tree = screen.render();
  assert.equal(
    findTree(tree, (node) => node.props?.['data-testid'] === 'input-coach-message').props.value,
    ''
  );
  findTree(tree, (node) => node.props?.testID === 'button-coach-goals').props.onPress();
  assert.deepEqual(screen.navigated, ['Goals']);
  assert.match(
    fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8'),
    /name="Goals"\s+component=\{GoalsScreen\}/
  );
  assert.equal(JSON.stringify(tree).includes('upgrade_to_premium'), false);
  assert.equal(
    findTree(tree, (node) => node.props?.children === 'coach_welcome_message'),
    undefined
  );
});

test('failed or malformed capability checks stay closed and can retry without generation', async () => {
  for (const response of [null, {}, { available: 'true' }, new Error('private provider details')]) {
    let recovered = false;
    const screen = mountCoach({
      getCoachCapabilities: async () => {
        if (recovered) return { available: false, code: 'AI_UNAVAILABLE' };
        if (response instanceof Error) throw response;
        return response;
      },
    });
    screen.effects();
    await flush();
    let tree = screen.render();
    assert.equal(
      findTree(tree, (node) => node.props?.testID === 'text-coach-availability').props.children,
      'coach_availability_failed'
    );
    assert.equal(JSON.stringify(tree).includes('private provider details'), false);
    assert.equal(
      findTree(tree, (node) => node.props?.['data-testid'] === 'input-coach-message').props
        .editable,
      false
    );
    recovered = true;
    await findTree(tree, (node) => node.props?.testID === 'button-retry-coach').props.onPress();
    tree = screen.render();
    assert.equal(
      findTree(tree, (node) => node.props?.testID === 'text-coach-availability').props.children,
      'coach_unavailable'
    );
  }
});

test('AI_UNAVAILABLE after an available check preserves typed chat input and offers manual Goals', async () => {
  let sent = 0;
  const screen = mountCoach({
    getCoachCapabilities: async () => ({ available: true }),
    getDailyInsight: async () => ({ insight: 'Verified insight' }),
    getCoachResponse: async () => {
      sent++;
      throw { code: 'AI_UNAVAILABLE', message: 'provider internals' };
    },
  });
  screen.effects();
  await flush();
  let tree = screen.render();
  assert.equal(
    findTree(tree, (node) => node.props?.['data-testid'] === 'input-coach-message').props.editable,
    true
  );
  findTree(
    tree,
    (node) => node.props?.['data-testid'] === 'input-coach-message'
  ).props.onChangeText('Keep this draft');
  tree = screen.render();
  await findTree(
    tree,
    (node) => node.props?.['data-testid'] === 'button-send-message'
  ).props.onPress();
  tree = screen.render();
  assert.equal(sent, 1);
  assert.equal(
    findTree(tree, (node) => node.props?.testID === 'text-coach-availability').props.children,
    'coach_unavailable'
  );
  assert.equal(
    findTree(tree, (node) => node.props?.['data-testid'] === 'input-coach-message').props.value,
    'Keep this draft'
  );
  assert.equal(
    findTree(tree, (node) => node.props?.['data-testid'] === 'input-coach-message').props.editable,
    false
  );
  assert.equal(JSON.stringify(tree).includes('provider internals'), false);
  assert(findTree(tree, (node) => node.props?.testID === 'button-coach-goals'));
});

test('a closed daily insight response also disables chat without inventing an insight', async () => {
  const screen = mountCoach({
    getCoachCapabilities: async () => ({ available: true }),
    getDailyInsight: async () => {
      throw { code: 'AI_UNAVAILABLE' };
    },
  });
  screen.effects();
  await flush();
  const tree = screen.render();
  assert.equal(
    findTree(tree, (node) => node.props?.testID === 'text-coach-availability').props.children,
    'coach_unavailable'
  );
  assert.equal(
    findTree(tree, (node) => node.props?.children === 'today_s_insight'),
    undefined
  );
});

test('actual Coach API uses the free capability route and never automatically retries generation', async () => {
  const calls = [];
  const { api } = loadSource(
    'src/lib/api.ts',
    {
      'expo-constants': { default: { expoConfig: { extra: { apiUrl: 'https://test.invalid' } } } },
      '../services/tokenManager': { tokenManager: { getToken: async () => 'account-token' } },
      './demoData': { DEMO_TOKEN: 'demo' },
      '../i18n': { t: (key) => key },
      './habits': { createHabitsApi: () => ({}) },
    },
    {
      console: { log() {} },
      fetch: async (url) => {
        calls.push(url);
        return url.endsWith('/capabilities')
          ? { ok: true, json: async () => ({ available: false, code: 'AI_UNAVAILABLE' }) }
          : { ok: false, status: 503, json: async () => ({ code: 'AI_UNAVAILABLE' }) };
      },
    }
  );
  assert.equal((await api.getCoachCapabilities()).available, false);
  await assert.rejects(
    api.getCoachResponse('unsent plan'),
    (error) => error.code === 'AI_UNAVAILABLE'
  );
  await assert.rejects(api.getDailyInsight(), (error) => error.code === 'AI_UNAVAILABLE');
  assert.deepEqual(calls, [
    'https://test.invalid/api/ai/capabilities',
    'https://test.invalid/api/ai-coach/chat',
    'https://test.invalid/api/ai-coach/daily-insight',
  ]);
  const demo = loadSource('src/lib/demoData.ts', { '../i18n': { t: (key) => key } });
  assert.deepEqual(demo.demoCevap('GET', '/api/ai/capabilities'), {
    available: false,
    code: 'AI_UNAVAILABLE',
  });
});

test('all seven locales include the reviewed unavailable, checking and retry messages', () => {
  for (const locale of ['en', 'tr', 'de', 'fr', 'es', 'it', 'ja']) {
    const catalog = loadSource(`src/i18n/${locale}.ts`)[locale];
    for (const key of [
      'coach_checking_availability',
      'coach_unavailable',
      'coach_availability_failed',
    ]) {
      assert.equal(typeof catalog[key], 'string');
      assert(catalog[key].trim());
    }
  }
});

test('actual navigator options localize all tabs and Avatar back labels without changing route names', () => {
  const source = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');
  const ast = ts.createSourceFile(
    'App.tsx',
    source,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TSX
  );
  const declarations = ast.statements.filter(
    (node) => ts.isFunctionDeclaration(node) && ['MainStack', 'MainTabs'].includes(node.name?.text)
  );
  assert.equal(declarations.length, 2);
  const code = ts.transpileModule(
    declarations.map((node) => `export ${node.getText(ast)}`).join('\n'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }
  ).outputText;
  const componentNames = [
    ...new Set([...source.matchAll(/component=\{(\w+)\}/g)].map((match) => match[1])),
  ].filter((name) => name !== 'MainTabs');
  const createElement = (type, props) => ({ type, props });
  for (const locale of ['en', 'tr', 'de', 'fr', 'es', 'it', 'ja']) {
    const catalog = loadSource(`src/i18n/${locale}.ts`)[locale];
    const globals = {
      ...loadSource('src/lib/coachAvailability.ts'),
      Stack: { Navigator: 'Stack.Navigator', Screen: 'Stack.Screen' },
      Tab: { Navigator: 'Tab.Navigator', Screen: 'Tab.Screen' },
      Platform: { OS: 'ios' },
      useTheme: () => ({ color: (value) => value }),
      t: (key) => {
        assert(catalog[key], `Missing ${locale}.${key}`);
        return catalog[key];
      },
      ...Object.fromEntries(componentNames.map((name) => [name, name])),
    };
    const module = { exports: {} };
    new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
      () => ({ jsx: createElement, jsxs: createElement }),
      module,
      module.exports,
      ...Object.values(globals)
    );
    const tabs = module.exports.MainTabs();
    const coach = findTree(tabs, (node) => node.props?.name === 'Coach');
    assert.equal(coach.props.options.tabBarButton(), null);
    assert.deepEqual(coach.props.options.tabBarItemStyle, { display: 'none' });
    for (const [route, key] of [
      ['Dashboard', 'nav_home'],
      ['Goals', 'goals'],
      ['Coach', 'nav_coach'],
      ['Habits', 'habits'],
      ['Profile', 'nav_profile'],
    ]) {
      assert.equal(
        findTree(tabs, (node) => node.props?.name === route).props.options.tabBarLabel,
        catalog[key]
      );
    }
    const stack = module.exports.MainStack();
    const tasks = findTree(stack, (node) => node.props?.name === 'Tasks');
    assert.equal(tasks.props.component, 'TasksScreen');
    assert.equal(tasks.props.options.title, '');
    assert.equal(tasks.props.options.headerBackTitle, catalog.nav_back);
    assert.equal(
      findTree(tabs, (node) => node.props?.name === 'Tasks'),
      undefined
    );
    const taskGoal = findTree(stack, (node) => node.props?.name === 'TaskGoal');
    assert.equal(taskGoal.props.component, 'GoalsScreen');
    assert.deepEqual(taskGoal.props.initialParams, { createForTask: true });
    const avatar = findTree(module.exports.MainStack(), (node) => node.props?.name === 'Avatar');
    assert.equal(avatar.props.options.headerBackTitle, catalog.nav_back);
    assert.equal(avatar.props.options.headerBackTruncatedTitle, catalog.nav_back);
    assert.equal(avatar.props.options.headerBackAccessibilityLabel, catalog.nav_back);
    assert.notEqual(avatar.props.options.headerBackTitle, 'MainTabs');
  }
});

const locales = ['en', 'tr', 'de', 'fr', 'es', 'it', 'ja'];
function localeCopy(locale) {
  const catalog = loadSource(`src/i18n/${locale}.ts`)[locale];
  return {
    catalog,
    imports: {
      '../../i18n': {
        t: (key) => {
          assert(catalog[key]?.trim(), `Missing ${locale}.${key}`);
          return catalog[key];
        },
      },
    },
  };
}
const byId = (tree, id) =>
  findTree(tree, (node) => node.props?.['data-testid'] === id || node.props?.testID === id);
const textContent = (node) => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  return node?.props ? textContent(node.props.children) : '';
};

test('Goals localizes edit/create controls and labels while preserving source IDs, status and payloads', async () => {
  for (const locale of locales) {
    const { catalog, imports } = localeCopy(locale);
    const calls = [];
    const goal = {
      id: 'goal-source-id',
      title: 'User $& title',
      description: 'Untranslated user description',
      category: 'personal',
      status: 'paused',
      progress: '37',
      targetOutcome: 'User outcome',
    };
    const screen = mount('src/screens/goals/GoalsScreen.tsx', {
      ...imports,
      '../../lib/api': {
        api: {
          getGoals: async () => [goal],
          updateGoal: async (...args) => calls.push(['update', ...args]),
          createGoal: async (...args) => calls.push(['create', ...args]),
        },
      },
    });
    screen.effects();
    await flush();
    let tree = screen.render();
    const card = byId(tree, `card-goal-${goal.id}`);
    assert(textContent(card).includes(catalog.goal_category_personal));
    assert(textContent(card).includes(catalog.goal_status_paused));
    assert(textContent(card).includes(goal.title));
    card.props.onPress();
    tree = screen.render();
    assert(findTree(tree, (node) => node.type === 'Modal' && node.props.visible));
    assert(findTree(tree, (node) => node.props?.children === catalog.edit_goal));
    assert.equal(textContent(byId(tree, 'button-save-goal')), catalog.update);
    for (const category of [
      'personal',
      'career',
      'health',
      'finance',
      'relationships',
      'education',
    ]) {
      const key = category === 'health' ? 'health' : `goal_category_${category}`;
      assert.equal(textContent(byId(tree, `button-category-${category}`)), catalog[key]);
    }
    byId(tree, 'button-category-finance').props.onPress();
    await byId(screen.render(), 'button-save-goal').props.onPress();
    assert.deepEqual(calls[0], [
      'update',
      goal.id,
      {
        title: goal.title,
        description: goal.description,
        category: 'finance',
        targetOutcome: goal.targetOutcome,
      },
    ]);
    // Editing display copy must not reset an existing paused goal or its progress.
    assert.equal('status' in calls[0][2], false);
    assert.equal('progress' in calls[0][2], false);
    byId(screen.render(), 'button-new-goal').props.onPress();
    tree = screen.render();
    assert(findTree(tree, (node) => node.props?.children === catalog.new_goal));
    assert.equal(textContent(byId(tree, 'button-save-goal')), catalog.create);
    byId(tree, 'input-goal-title').props.onChangeText('New user goal');
    byId(tree, 'button-category-career').props.onPress();
    await byId(screen.render(), 'button-save-goal').props.onPress();
    assert.deepEqual(calls[1], [
      'create',
      {
        title: 'New user goal',
        description: '',
        category: 'career',
        targetOutcome: '',
        status: 'active',
        progress: '0',
      },
    ]);
    assert.equal(catalog.confirm_delete_goal.match(/\{title\}/g)?.length, 1);
  }
});

test('Goals preserves drafts and asks for result verification after uncertain create, edit and delete', async () => {
  const alerts = [];
  let writes = 0;
  const fail = async () => {
    writes++;
    throw { outcomeUnknown: true };
  };
  const goal = {
    id: 'one',
    title: 'Existing goal',
    category: 'personal',
    status: 'active',
    progress: '0',
    targetOutcome: '',
  };
  const screen = mount('src/screens/goals/GoalsScreen.tsx', {
    'react-native': { ...native, Alert: { alert: (...args) => alerts.push(args) } },
    '../../lib/api': {
      api: { getGoals: async () => [goal], createGoal: fail, updateGoal: fail, deleteGoal: fail },
    },
  });
  screen.effects();
  await flush();
  byId(screen.render(), 'card-goal-one').props.onPress();
  await byId(screen.render(), 'button-save-goal').props.onPress();
  assert.deepEqual(alerts.at(-1), ['error', 'request_outcome_unknown']);
  assert.equal(byId(screen.render(), 'input-goal-title').props.value, goal.title);
  byId(screen.render(), 'button-new-goal').props.onPress();
  byId(screen.render(), 'input-goal-title').props.onChangeText('Unconfirmed draft');
  await byId(screen.render(), 'button-save-goal').props.onPress();
  assert.deepEqual(alerts.at(-1), ['error', 'request_outcome_unknown']);
  assert.equal(byId(screen.render(), 'input-goal-title').props.value, 'Unconfirmed draft');
  byId(screen.render(), 'card-goal-one').props.onLongPress();
  await alerts
    .at(-1)[2]
    .find((button) => button.style === 'destructive')
    .onPress();
  assert.deepEqual(alerts.at(-1), ['error', 'request_outcome_unknown']);
  assert.equal(writes, 3);
});

test('Tasks preserves an unconfirmed draft and does not encourage blindly repeating a completion', async () => {
  const alerts = [];
  let writes = 0;
  const fail = async () => {
    writes++;
    throw { outcomeUnknown: true };
  };
  const screen = mount('src/screens/tasks/TasksScreen.tsx', {
    'react-native': { ...native, Alert: { alert: (...args) => alerts.push(args) } },
    '../../lib/api': {
      api: {
        getTasks: async () => ({
          tasks: [{ id: 'one', title: 'Pending', status: 'pending', priority: 'medium' }],
          totalCount: 1,
        }),
        getGoals: async () => [{ id: 'goal-a', title: 'Actual goal', status: 'active' }],
        createTask: fail,
        completeTask: fail,
      },
    },
  });
  screen.effects();
  await flush();
  await findTree(screen.render(), (node) => node.key === 'one').props.onPress();
  assert.deepEqual(alerts.at(-1), ['error', 'request_outcome_unknown']);
  findTree(screen.render(), (node) => node.props?.placeholder === 'task_title').props.onChangeText(
    'Draft task'
  );
  findTree(screen.render(), (node) => node.props?.testID === 'task-goal-goal-a').props.onPress();
  await findTree(
    screen.render(),
    (node) => node.type === 'TouchableOpacity' && textContent(node) === 'create'
  ).props.onPress();
  assert.deepEqual(alerts.at(-1), ['error', 'request_outcome_unknown']);
  assert.equal(
    findTree(screen.render(), (node) => node.props?.placeholder === 'task_title').props.value,
    'Draft task'
  );
  assert.equal(writes, 2);
});

test('all seven locales explain an uncertain write result before suggesting another attempt', () => {
  for (const locale of locales) {
    const { catalog } = localeCopy(locale);
    assert.equal(typeof catalog.request_outcome_unknown, 'string');
    assert(catalog.request_outcome_unknown.length > 40);
    assert.notEqual(catalog.request_outcome_unknown, catalog.request_timeout);
  }
});

test('Avatar localizes all known fields and rarity labels without changing trait content or API IDs', async () => {
  const categories = {
    appearance: ['skin', 'body', 'face_shape', 'eyes', 'eyebrows', 'nose', 'mouth', 'ears'],
    hair_face: ['hair', 'hair_color', 'facial_hair', 'makeup', 'glasses'],
    clothing: ['clothing_top', 'clothing_bottom', 'shoes'],
    accessories: ['hat', 'jewelry', 'tattoo', 'scars'],
    effects: ['wings', 'aura', 'pet', 'background', 'frame'],
  };
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const zones = Object.values(categories)
    .flat()
    .map((key) => ({ id: `source-${key}`, key, name: `Server ${key}` }));
  const traits = zones.map((zone, index) => ({
    id: `trait-${zone.key}`,
    zoneId: zone.id,
    name: `Catalog ${zone.key}`,
    rarity: rarities[index % rarities.length],
    isDefault: index === 0,
    coinCost: 50,
    unlockType: 'purchase',
  }));
  const equipped = zones.slice(0, 4).map((zone) => ({
    id: `equipped-${zone.key}`,
    zoneId: zone.id,
    traitId: 'previous-trait',
    zone,
    trait: { name: 'Original catalog name', rarity: 'rare' },
  }));
  for (const locale of locales) {
    const { catalog, imports } = localeCopy(locale);
    const reads = [];
    const equippedCalls = [];
    const screen = mountAvatar(
      {
        getAvatarZones: async () => zones,
        getMyEquipped: async () => equipped,
        getTraitsByZone: async (id) => {
          reads.push(id);
          return traits.filter((trait) => trait.zoneId === id);
        },
        equipTrait: async (...args) => equippedCalls.push(args),
      },
      imports
    );
    screen.effects();
    await flush();
    for (const [category, keys] of Object.entries(categories)) {
      byId(screen.render(), `tab-category-${category}`).props.onPress();
      screen.render();
      screen.effects();
      await flush();
      const tree = screen.render();
      assert.equal(textContent(byId(tree, `tab-category-${category}`)), catalog[category]);
      for (const key of keys) {
        assert.equal(byId(tree, `text-zone-${key}`).props.children, catalog[`avatar_zone_${key}`]);
        const trait = traits.find((value) => value.zoneId === `source-${key}`);
        const card = byId(tree, `trait-card-${trait.id}`);
        assert(card);
        assert(textContent(card).includes(trait.name));
        assert(textContent(card).includes(catalog[`rarity_${trait.rarity}`]));
      }
      if (category === 'appearance') {
        assert(textContent(tree).includes(`${catalog.level} 7`));
        assert.deepEqual(
          findTree(tree, (node) => node.type === 'AvatarPreview').props.equipped,
          equipped,
          'all equipped rows reach the honest preview; none are silently truncated'
        );
        assert(
          byId(tree, 'button-get-coins').props.accessibilityLabel.includes(
            catalog.coin_balance_get_more_coins
          )
        );
        byId(tree, 'trait-card-trait-skin').props.onPress();
        await flush();
        assert.deepEqual(equippedCalls, [['source-skin', 'trait-skin']]);
        byId(screen.render(), 'trait-card-trait-body').props.onPress();
        const modal = byId(screen.render(), 'modal-purchase');
        assert(textContent(modal).includes(catalog.rarity_uncommon));
        assert(textContent(modal).includes(catalog.avatar_unlock_description));
        assert(textContent(modal).includes('Catalog body'));
        byId(modal, 'button-cancel-purchase').props.onPress();
      }
    }
    assert.deepEqual(new Set(reads), new Set(zones.map((zone) => zone.id)));
    assert.equal(catalog.avatar_more_equipped.match(/\{count\}/g)?.length, 1);
  }
});

test('free Profile offers restore without closed new-sales promises in every locale', async () => {
  for (const locale of locales) {
    const { catalog, imports } = localeCopy(locale);
    const screen = mountProfile(async () => stats(), {
      ...imports,
      '../../hooks/useSubscription': {
        useSubscription: () => ({ status: 'verified', subscription: { isPremium: false } }),
      },
    });
    screen.focus();
    await flush();
    const action = byId(screen.render(), 'button-subscription-settings');
    assert.equal(byId(screen.render(), 'button-upgrade-premium'), undefined);
    assert(textContent(action).includes(catalog.restore_purchases));
    assert.equal(textContent(action).includes(catalog.choose_your_plan), false);
    assert.equal(textContent(action).includes(catalog.get_unlimited_access), false);
    action.props.onPress();
    assert.deepEqual(screen.navigated, ['Premium']);
  }
});

const coinLibrary = loadSource('src/lib/coinBalance.ts');
function coinFixture(initialBalance = 1000) {
  const fixture = { response: { balance: initialBalance }, reads: 0 };
  const store = new coinLibrary.CoinBalanceStore(async () => {
    fixture.reads++;
    if (fixture.response instanceof Error) throw fixture.response;
    return fixture.response;
  });
  store.setAccount('user:A');
  const useCoinBalance = () => ({
    ...store.getSnapshot(),
    refresh: store.refresh,
    confirm: store.confirm,
    captureAccount: store.captureAccount,
  });
  return {
    fixture,
    store,
    imports: { '../../hooks/useCoinBalance': { useCoinBalance } },
    useCoinBalance,
  };
}

test('Profile and Avatar share the verified server balance, including zero and unknown; ignore the Firestore value', async () => {
  const coins = coinFixture();
  const imports = {
    ...coins.imports,
    '../../store/authStore': {
      useAuthStore: () => ({ user: {}, userProfile: { coinBalance: 100 } }),
    },
  };
  const profile = mountProfile(async () => stats(), imports);
  const avatar = mountAvatar({}, imports);
  profile.focus();
  avatar.effects();
  await flush();
  for (const response of [{ balance: 1000 }, { balance: 0 }, new Error('offline')]) {
    coins.fixture.response = response;
    await coins.store.refresh();
    const expected = response instanceof Error ? '—' : response.balance;
    assert(
      findTree(profile.render(), (node) => node.type === 'Text' && node.props.children === expected)
    );
    assert.equal(byId(avatar.render(), 'text-coin-balance').props.children, expected);
  }
});

test('actual Avatar unlock uses server funds and updates the common balance after success', async () => {
  const coins = coinFixture();
  await coins.store.refresh();
  const zone = { id: 'skin-zone', key: 'skin', name: 'Skin' };
  const trait = {
    id: 'paid-trait',
    name: 'Trait',
    coinCost: 250,
    rarity: 'common',
    unlockType: 'purchase',
  };
  const unlocks = [];
  const screen = mountAvatar(
    {
      getAvatarZones: async () => [zone],
      getTraitsByZone: async () => [trait],
      unlockTrait: async (id) => {
        unlocks.push(id);
        coins.fixture.response = { balance: 750 };
      },
    },
    coins.imports
  );
  screen.effects();
  await flush();
  screen.render();
  screen.effects();
  await flush();
  byId(screen.render(), 'trait-card-paid-trait').props.onPress();
  const purchase = byId(screen.render(), 'button-confirm-purchase');
  assert.equal(purchase.props.disabled, false);
  await purchase.props.onPress();
  assert.deepEqual(unlocks, ['paid-trait']);
  assert.equal(coins.fixture.reads, 2);
  assert.equal(byId(screen.render(), 'text-coin-balance').props.children, 750);
  coins.fixture.response = new Error('offline');
  await coins.store.refresh();
  byId(screen.render(), 'trait-card-paid-trait').props.onPress();
  const unknown = screen.render();
  assert.equal(byId(unknown, 'text-coin-balance').props.children, '—');
  assert.equal(byId(unknown, 'button-confirm-purchase').props.disabled, true);
  assert.equal(
    byId(unknown, 'button-need-coins'),
    undefined,
    'unknown balance is not insufficient funds'
  );
});

test('actual Coins purchase refreshes common server funds and suppresses success on account change', async () => {
  for (const switchAccount of [false, true]) {
    const coins = coinFixture();
    await coins.store.refresh();
    const products = loadSource('src/config/products.ts');
    const product = { id: products.COIN_IDS[0], displayPrice: '$1.99', title: 'Coins' };
    const calls = [],
      alerts = [];
    const screen = mount('src/screens/CoinsScreen.tsx', {
      'react-native': { ...native, Alert: { alert: (...args) => alerts.push(args) } },
      '../config/products': products,
      '../services/iap': {
        loadCoinProducts: async () => [product],
        buyCoins: async (id) => {
          calls.push(id);
          coins.fixture.response = { balance: 1100 };
          if (switchAccount) coins.store.setAccount('user:B');
        },
      },
      '../hooks/useCoinBalance': { useCoinBalance: coins.useCoinBalance },
      '../i18n': { t: (key) => key },
      '../lib/accountGate': { purchaseBlockedInDemo: () => false },
      '../theme/ThemeProvider': {
        useTheme: () => ({ color: (value) => value }),
        useThemedStyles: (styles) => styles,
      },
    });
    screen.effects();
    await flush();
    const buy = findTree(
      screen.render(),
      (node) => node.props?.accessibilityLabel === '100 coins for $1.99'
    );
    assert(buy);
    await buy.props.onPress();
    assert.deepEqual(calls, [product.id]);
    assert.equal(coins.fixture.reads, switchAccount ? 1 : 2);
    assert.equal(alerts.length, switchAccount ? 0 : 1);
    assert.equal(coins.store.getSnapshot().balance, switchAccount ? null : 1100);
    assert(
      findTree(
        screen.render(),
        (node) => node.type === 'Text' && node.props.children === (switchAccount ? '—' : 1100)
      )
    );
  }
});

test('Coins balance retry after a verified purchase never buys again or claims unverified credit', async () => {
  for (const locale of locales) {
    const catalog = loadSource(`src/i18n/${locale}.ts`)[locale];
    assert(catalog.coin_balance_unavailable?.trim(), `Missing ${locale} balance notice`);
    const coins = coinFixture();
    await coins.store.refresh();
    const products = loadSource('src/config/products.ts');
    const product = { id: products.COIN_IDS[0], displayPrice: '$1.99', title: 'Coins' };
    const calls = [],
      alerts = [];
    const screen = mount('src/screens/CoinsScreen.tsx', {
      'react-native': { ...native, Alert: { alert: (...args) => alerts.push(args) } },
      '../config/products': products,
      '../services/iap': {
        loadCoinProducts: async () => [product],
        buyCoins: async (id) => {
          calls.push(id);
          coins.fixture.response = new Error('offline');
        },
      },
      '../hooks/useCoinBalance': { useCoinBalance: coins.useCoinBalance },
      '../i18n': { t: (key) => catalog[key] },
      '../lib/accountGate': { purchaseBlockedInDemo: () => false },
      '../theme/ThemeProvider': {
        useTheme: () => ({ color: (value) => value }),
        useThemedStyles: (styles) => styles,
      },
    });
    screen.effects();
    await flush();
    await findTree(
      screen.render(),
      (node) => node.props?.accessibilityLabel === '100 coins for $1.99'
    ).props.onPress();
    assert.deepEqual(alerts, [], 'unverified balance must not display a credited success alert');
    assert(
      findTree(screen.render(), (node) => node.props?.children === catalog.coin_balance_unavailable)
    );
    assert.equal(coins.store.getSnapshot().balance, null);
    await byId(screen.render(), 'button-retry-coin-balance').props.onPress();
    assert.equal(coins.store.getSnapshot().balance, null);
    assert.deepEqual(
      calls,
      [product.id],
      'retry reads balance; it must never request another payment'
    );
    coins.fixture.response = { balance: 1100 };
    await byId(screen.render(), 'button-retry-coin-balance').props.onPress();
    assert.equal(coins.store.getSnapshot().balance, 1100);
    assert.equal(byId(screen.render(), 'button-retry-coin-balance'), undefined);
    assert.deepEqual(calls, [product.id]);
    assert.deepEqual(alerts, []);
  }
});

test('Avatar discards post-unlock trait responses after switching accounts or re-entering the same UID', async () => {
  for (const newAccount of ['user:B', 'user:A']) {
    const coins = coinFixture();
    await coins.store.refresh();
    const zone = { id: 'skin-zone', key: 'skin', name: 'Skin' };
    const trait = {
      id: 'paid-trait',
      name: 'Trait',
      coinCost: 250,
      rarity: 'common',
      unlockType: 'purchase',
    };
    let resolveTraits,
      reads = 0,
      equips = 0;
    const laterTraits = new Promise((resolve) => {
      resolveTraits = resolve;
    });
    const screen = mountAvatar(
      {
        getAvatarZones: async () => [zone],
        getTraitsByZone: async () => [trait],
        getMyTraits: () => (++reads === 2 ? laterTraits : Promise.resolve([])),
        unlockTrait: async () => {
          coins.fixture.response = { balance: 750 };
        },
        equipTrait: async () => {
          equips++;
        },
      },
      coins.imports
    );
    screen.effects();
    await flush();
    screen.render();
    screen.effects();
    await flush();
    byId(screen.render(), 'trait-card-paid-trait').props.onPress();
    const purchase = byId(screen.render(), 'button-confirm-purchase').props.onPress();
    await flush();
    assert.equal(reads, 2, 'post-unlock trait request is in flight');
    coins.store.setAccount(null);
    coins.store.setAccount(newAccount);
    resolveTraits([{ traitId: 'paid-trait' }]);
    await purchase;
    assert.equal(
      findTree(screen.render(), (node) => node.type === 'Modal'),
      undefined,
      'previous account UI is hidden immediately'
    );
    screen.effects();
    await flush();
    screen.render();
    screen.effects();
    await flush();
    byId(screen.render(), 'trait-card-paid-trait').props.onPress();
    await flush();
    assert.equal(equips, 0, 'old account ownership must not become current ownership');
  }
});

test('Avatar replaces the actual preview after confirmed equip using the unchanged server IDs', async () => {
  const coins = coinFixture();
  const zone = { id: 'server-hair', key: 'hair', name: 'Hair' };
  const short = {
    id: 'short-id',
    zoneId: zone.id,
    name: 'Short',
    isActive: true,
    isDefault: true,
    coinCost: 0,
    unlockType: 'default',
    rarity: 'common',
  };
  const long = { ...short, id: 'long-id', name: 'Long' };
  const row = (trait) => ({ id: 'equipped-hair', zoneId: zone.id, traitId: trait.id, zone, trait });
  let current = short;
  const calls = [];
  const screen = mountAvatar(
    {
      getAvatarZones: async () => [zone],
      getMyEquipped: async () => [row(current)],
      getTraitsByZone: async () => [short, long],
      equipTrait: async (...args) => {
        calls.push(args);
        current = long;
      },
    },
    coins.imports
  );
  screen.effects();
  await flush();
  byId(screen.render(), 'tab-category-hair_face').props.onPress();
  screen.render();
  screen.effects();
  await flush();
  assert.equal(
    findTree(screen.render(), (node) => node.type === 'AvatarPreview').props.equipped[0].trait.name,
    'Short'
  );
  byId(screen.render(), 'trait-card-long-id').props.onPress();
  await flush();
  assert.deepEqual(calls, [['server-hair', 'long-id']]);
  const preview = findTree(screen.render(), (node) => node.type === 'AvatarPreview');
  assert.equal(preview.props.equipped[0].trait.name, 'Long');
  assert.equal(preview.props.demo, false);
});

test('Avatar never reveals a previous account from late initial reads or late equip reads', async () => {
  for (const stage of ['initial', 'equip']) {
    for (const nextAccount of ['user:B', 'user:A']) {
      const coins = coinFixture();
      const zone = { id: 'zone-skin', key: 'skin', name: 'Skin' };
      const trait = {
        id: 'trait-deep',
        zoneId: zone.id,
        name: 'Deep',
        isActive: true,
        isDefault: true,
        coinCost: 0,
        unlockType: 'default',
        rarity: 'common',
      };
      const oldRow = { id: 'equipped', zoneId: zone.id, traitId: trait.id, zone, trait };
      let resolveOld,
        reads = 0;
      const old = new Promise((resolve) => {
        resolveOld = resolve;
      });
      const screen = mountAvatar(
        {
          getAvatarZones: async () => [zone],
          getTraitsByZone: async () => [trait],
          equipTrait: async () => {},
          getMyEquipped: () => {
            reads++;
            return (stage === 'initial' && reads === 1) || (stage === 'equip' && reads === 2)
              ? old
              : Promise.resolve([]);
          },
        },
        coins.imports
      );
      screen.effects();
      await flush();
      if (stage === 'equip') {
        screen.render();
        screen.effects();
        await flush();
        byId(screen.render(), 'trait-card-trait-deep').props.onPress();
        await flush();
        assert.equal(reads, 2);
      }
      coins.store.setAccount(null);
      coins.store.setAccount(nextAccount);
      assert.equal(
        findTree(screen.render(), (node) => node.type === 'AvatarPreview'),
        undefined,
        'old view is hidden before effects'
      );
      screen.effects();
      await flush();
      resolveOld([oldRow]);
      await flush();
      const preview = findTree(screen.render(), (node) => node.type === 'AvatarPreview');
      assert.deepEqual(preview.props.equipped, [], 'late old equipped row is not applied');
    }
  }
});

test('failed Avatar equip preserves the preview, announces failure, and only retries when the same trait is pressed', async () => {
  for (const mode of ['rejected', 'uncertain', 'read-failed', 'malformed-read']) {
    const coins = coinFixture();
    const zone = { id: 'hair', key: 'hair', name: 'Hair' };
    const trait = (name) => ({
      id: name,
      zoneId: zone.id,
      name,
      isDefault: true,
      isActive: true,
      coinCost: 0,
      unlockType: 'default',
      rarity: 'common',
    });
    const short = trait('Short'),
      long = trait('Long');
    const row = (trait) => ({ id: 'eq', zoneId: zone.id, traitId: trait.id, zone, trait });
    let current = short,
      calls = 0;
    const screen = mountAvatar(
      {
        getAvatarZones: async () => [zone],
        getTraitsByZone: async () => [short, long],
        getMyEquipped: async () => {
          if (calls === 1 && mode === 'read-failed') throw Error('offline');
          if (calls === 1 && mode === 'malformed-read') return null;
          return [row(current)];
        },
        equipTrait: async () => {
          calls++;
          if (calls === 1 && ['rejected', 'uncertain'].includes(mode))
            throw { outcomeUnknown: mode === 'uncertain' };
          current = long;
        },
      },
      coins.imports
    );
    screen.effects();
    await flush();
    byId(screen.render(), 'tab-category-hair_face').props.onPress();
    screen.render();
    screen.effects();
    await flush();
    byId(screen.render(), 'trait-card-Long').props.onPress();
    await flush();
    let tree = screen.render();
    assert.equal(calls, 1, 'no automatic mutation retry');
    assert.equal(
      findTree(tree, (n) => n.type === 'AvatarPreview').props.equipped[0].trait.name,
      'Short'
    );
    const error = byId(tree, 'avatar-action-error');
    assert.equal(error.props.accessibilityRole, 'alert');
    assert.equal(
      error.props.children,
      mode === 'rejected' ? 'error. please_try_again_2' : 'request_outcome_unknown'
    );
    assert.equal(byId(tree, 'trait-card-Long').props.disabled, false);
    byId(tree, 'trait-card-Long').props.onPress();
    await flush();
    tree = screen.render();
    assert.equal(calls, 2);
    assert.equal(byId(tree, 'avatar-action-error'), undefined);
    assert.equal(
      findTree(tree, (n) => n.type === 'AvatarPreview').props.equipped[0].trait.name,
      'Long'
    );
  }
});

test('Avatar purchase failure stays visible inside its modal, preserves ownership and clears after explicit success', async () => {
  const coins = coinFixture();
  await coins.store.refresh();
  const zone = { id: 'skin', key: 'skin', name: 'Skin' };
  const trait = {
    id: 'paid',
    zoneId: zone.id,
    name: 'Paid original',
    isDefault: false,
    coinCost: 250,
    unlockType: 'purchase',
    rarity: 'rare',
  };
  let calls = 0,
    owned = false;
  const screen = mountAvatar(
    {
      getAvatarZones: async () => [zone],
      getTraitsByZone: async () => [trait],
      getMyTraits: async () => (owned ? [{ traitId: 'paid' }] : []),
      unlockTrait: async () => {
        calls++;
        if (calls === 1) throw Error('rejected');
        owned = true;
        coins.fixture.response = { balance: 750 };
      },
    },
    coins.imports
  );
  screen.effects();
  await flush();
  screen.render();
  screen.effects();
  await flush();
  byId(screen.render(), 'trait-card-paid').props.onPress();
  await byId(screen.render(), 'button-confirm-purchase').props.onPress();
  let tree = screen.render();
  assert.equal(calls, 1);
  assert.equal(owned, false);
  assert.equal(byId(tree, 'avatar-purchase-error').props.accessibilityRole, 'alert');
  assert.equal(findTree(tree, (n) => n.type === 'Modal').props.visible, true);
  assert.deepEqual(findTree(tree, (n) => n.type === 'AvatarPreview').props.equipped, []);
  await byId(tree, 'button-confirm-purchase').props.onPress();
  tree = screen.render();
  assert.equal(calls, 2);
  assert.equal(owned, true);
  assert.equal(findTree(tree, (n) => n.type === 'Modal').props.visible, false);
  assert.equal(byId(tree, 'avatar-purchase-error'), undefined);
});

test('existing subscriber keeps a working manage route while new sales stay closed', async () => {
  const screen = mountProfile(async () => stats(), {
    '../../hooks/useSubscription': {
      useSubscription: () => ({
        status: 'verified',
        subscription: { isPremium: true, subscriptionTier: 'pro' },
      }),
    },
  });
  screen.focus();
  await flush();
  const action = byId(screen.render(), 'button-subscription-settings');
  assert(textContent(action).includes('manage_subscription'));
  assert.equal(byId(screen.render(), 'button-upgrade-premium'), undefined);
  action.props.onPress();
  assert.deepEqual(screen.navigated, ['Premium']);
});

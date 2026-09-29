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
  let mounted = false;
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
    useEffect: (callback) => {
      if (!mounted) effects.push(callback);
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
      useNavigation: () => ({ navigate: (route) => navigated.push(route) }),
    },
    '../../store/authStore': { useAuthStore: () => ({ user: {}, userProfile: {} }) },
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
    const tree = Screen({ navigation: { navigate: (route) => navigated.push(route) }, ...props });
    mounted = true;
    return tree;
  };
  const initial = render();
  return {
    initial,
    render,
    navigated,
    focus: () => focus(),
    effects: () => effects.forEach((run) => run()),
  };
}

function mountProfile(getUserStats) {
  return mount('src/screens/profile/ProfileScreen.tsx', {
    '../../lib/api': { default: { getUserStats } },
    '../../services/storage': { default: {} },
    'expo-image-picker': {},
    'expo-constants': { default: { expoConfig: { version: '1.2', ios: { buildNumber: '125' } } } },
    '../../hooks/useSubscription': { useSubscription: () => ({ status: 'loading' }) },
  });
}

function mountAvatar(overrides = {}) {
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
      (node) => node.type === 'Text' && JSON.stringify(node.props.children) === '["Level ",7]'
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
        (node) => node.type === 'Text' && JSON.stringify(node.props.children) === '["Level ",7]'
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

test('closed Coach sends no generation requests, preserves draft through retry and opens real Goals', async () => {
  const screen = mountCoach();
  screen.effects();
  await flush();
  let tree = screen.render();
  assert.equal(
    findTree(tree, (node) => node.props?.testID === 'text-coach-availability').props.children,
    'coach_unavailable'
  );
  findTree(
    tree,
    (node) => node.props?.['data-testid'] === 'input-coach-message'
  ).props.onChangeText('My unsent plan');
  tree = screen.render();
  const send = findTree(tree, (node) => node.props?.['data-testid'] === 'button-send-message');
  assert.equal(send.props.disabled, true);
  await send.props.onPress();
  await findTree(tree, (node) => node.props?.testID === 'button-retry-coach').props.onPress();
  tree = screen.render();
  assert.equal(
    findTree(tree, (node) => node.props?.['data-testid'] === 'input-coach-message').props.value,
    'My unsent plan'
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
    const avatar = findTree(module.exports.MainStack(), (node) => node.props?.name === 'Avatar');
    assert.equal(avatar.props.options.headerBackTitle, catalog.nav_back);
    assert.equal(avatar.props.options.headerBackTruncatedTitle, catalog.nav_back);
    assert.equal(avatar.props.options.headerBackAccessibilityLabel, catalog.nav_back);
    assert.notEqual(avatar.props.options.headerBackTitle, 'MainTabs');
  }
});

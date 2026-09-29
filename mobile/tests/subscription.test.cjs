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

const library = loadSource('src/lib/subscription.ts');
const { SubscriptionStore, parseSubscriptionStatus } = library;
const now = Date.parse('2026-09-26T12:00:00Z');
function status(tier = 'free', end = now + 86400000, trial = false) {
  const active = tier !== 'free';
  return {
    subscriptionTier: tier,
    subscriptionStatus: active ? (trial ? 'trialing' : 'active') : 'inactive',
    subscriptionCurrentPeriodEnd: end === null ? null : new Date(end).toISOString(),
    isPremium: active,
    features: {
      unlimitedGoals: active,
      aiCoaching: active,
      advancedAnalytics: active,
      prioritySupport: tier === 'team',
    },
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise(setImmediate);

test('server free/pro/team and trialing contracts are accepted; stale free dates never grant', () => {
  for (const tier of ['free', 'pro', 'team']) {
    assert.equal(parseSubscriptionStatus(status(tier), now).subscriptionTier, tier);
  }
  assert.equal(parseSubscriptionStatus(status('pro', now + 100, true), now).isPremium, true);
  assert.equal(parseSubscriptionStatus(status('free', now - 100), now).isPremium, false);
  assert.equal(parseSubscriptionStatus(status('free', null), now).isPremium, false);
});

test('malformed, expired and contradictory responses remain unverified', async () => {
  const invalid = [
    null,
    {},
    { ...status('pro'), subscriptionTier: 'premium' },
    { ...status('pro'), isPremium: 'true' },
    { ...status('pro'), subscriptionCurrentPeriodEnd: null },
    { ...status('pro'), subscriptionCurrentPeriodEnd: 'not-a-date' },
    { ...status('pro'), features: {} },
    { ...status('pro'), isPremium: false },
    { ...status('pro'), features: status('free').features },
    status('pro', now),
    status('team', now - 100),
  ];
  for (const response of invalid) {
    assert.throws(() => parseSubscriptionStatus(response, now));
    const store = new SubscriptionStore(
      async () => response,
      () => now
    );
    store.setAccount('A');
    assert.equal(await store.refresh(), null);
    assert.equal(store.getSnapshot().status, 'error');
    assert.equal(store.getSnapshot().subscription, null);
  }
});

test('explicit free clears paid state; a failed read shows unknown rather than a paid or free claim', async () => {
  let response = status('team');
  const store = new SubscriptionStore(
    async () => {
      if (response instanceof Error) throw response;
      return response;
    },
    () => now
  );
  store.setAccount('A');
  await store.refresh();
  response = status('free');
  await store.refresh();
  assert.equal(store.getSnapshot().subscription.isPremium, false);
  response = new Error('503');
  await store.refresh();
  assert.equal(store.getSnapshot().status, 'error');
  assert.equal(store.getSnapshot().subscription, null);
});

test('late account A success or failure cannot overwrite verified account B', async () => {
  for (const fails of [false, true]) {
    const first = deferred();
    const store = new SubscriptionStore(
      (id) => (id === 'A' ? first.promise : Promise.resolve(status('pro'))),
      () => now
    );
    store.setAccount('A');
    const old = store.refresh();
    await flush();
    store.setAccount('B');
    await store.refresh();
    fails ? first.reject(new Error('old failure')) : first.resolve(status('team'));
    assert.equal(await old, null);
    assert.equal(store.getSnapshot().accountId, 'B');
    assert.equal(store.getSnapshot().subscription.subscriptionTier, 'pro');
  }
});

test('logout and sign-in to the same UID still invalidate the former session response', async () => {
  const first = deferred();
  let calls = 0;
  const store = new SubscriptionStore(
    () => (++calls === 1 ? first.promise : Promise.resolve(status())),
    () => now
  );
  store.setAccount('A');
  const old = store.refresh();
  await flush();
  store.setAccount(null);
  assert.equal(store.getSnapshot().subscription, null);
  store.setAccount('A');
  await store.refresh();
  first.resolve(status('team'));
  assert.equal(await old, null);
  assert.equal(store.getSnapshot().subscription.subscriptionTier, 'free');
});

test('post-purchase read supersedes an older read and preserves the server-selected tier', async () => {
  const first = deferred();
  let calls = 0;
  const store = new SubscriptionStore(
    () => (++calls === 1 ? first.promise : Promise.resolve(status('team'))),
    () => now
  );
  store.setAccount('A');
  const old = store.refresh();
  assert.equal(store.refresh(), old, 'ordinary readers share an in-flight request');
  await flush();
  assert.equal(await store.confirm(async () => 'selected-pro-product'), 'active');
  first.resolve(status('free'));
  await old;
  assert.equal(store.getSnapshot().subscription.subscriptionTier, 'team');
});

test('restore count does not grant access and failed status verification is explicit', async () => {
  let fail = false;
  const store = new SubscriptionStore(
    async () => {
      if (fail) throw new Error('503');
      return status('free');
    },
    () => now
  );
  store.setAccount('A');
  assert.equal(await store.confirm(async () => 4), 'inactive');
  fail = true;
  assert.equal(await store.confirm(async () => 4), 'unverified');
});

test('account changes during purchase or its final read suppress another account success/error', async () => {
  for (const rejection of [false, true]) {
    const action = deferred();
    const store = new SubscriptionStore(
      async () => status('team'),
      () => now
    );
    store.setAccount('A');
    const result = store.confirm(() => action.promise);
    store.setAccount('B');
    rejection ? action.reject(new Error('old purchase error')) : action.resolve();
    assert.equal(await result, 'account-changed');
    assert.equal(store.getSnapshot().subscription, null);
  }
  const response = deferred();
  const store = new SubscriptionStore(
    () => response.promise,
    () => now
  );
  store.setAccount('A');
  const result = store.confirm(async () => {});
  await flush();
  store.setAccount(null);
  response.resolve(status('pro'));
  assert.equal(await result, 'account-changed');
});

test('expiry removes a cached grant without inventing Free and a renewal can be verified', async () => {
  let time = now;
  const store = new SubscriptionStore(
    async () => status('pro', time + 100),
    () => time
  );
  store.setAccount('A');
  await store.refresh();
  time += 100;
  store.expire();
  assert.equal(store.getSnapshot().status, 'idle');
  assert.equal(store.getSnapshot().subscription, null);
  await store.refresh();
  assert.equal(store.getSnapshot().subscription.isPremium, true);
});

test('unauthenticated state neither reads status nor starts a purchase', async () => {
  const store = new SubscriptionStore(() => assert.fail('unexpected network'));
  assert.equal(await store.refresh(), null);
  assert.equal(await store.confirm(() => assert.fail('unexpected charge')), 'account-changed');
});

test('actual API uses the explicitly scoped token even when the shared token belongs to another account', async () => {
  const calls = [];
  const { api } = loadSource(
    'src/lib/api.ts',
    {
      'expo-constants': { default: { expoConfig: { extra: { apiUrl: 'https://test.invalid' } } } },
      '../services/tokenManager': { tokenManager: { getToken: async () => 'other-account-token' } },
      './demoData': { DEMO_TOKEN: 'demo' },
      '../i18n': { t: (key) => key },
      './habits': { createHabitsApi: () => ({}) },
    },
    {
      console: { log() {} },
      fetch: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, json: async () => status('pro') };
      },
    }
  );
  await api.getSubscriptionStatus('scoped-account-token');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://test.invalid/api/subscription/status');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer scoped-account-token');
});

test('actual hook binds Firebase identity, ignores an old token lookup and keeps demo offline', async () => {
  const oldToken = deferred();
  let auth = {
    user: { uid: 'A', getIdToken: () => oldToken.promise },
    isAuthenticated: true,
    isDemo: false,
  };
  const listeners = [];
  const useAuthStore = Object.assign((selector) => selector(auth), {
    getState: () => auth,
    subscribe: (callback) => listeners.push(callback),
  });
  let focus;
  const tokens = [];
  const { useSubscription } = loadSource('src/hooks/useSubscription.ts', {
    react: { useCallback: (fn) => fn, useEffect() {}, useSyncExternalStore: (_, get) => get() },
    'react-native': { AppState: {} },
    '@react-navigation/native': {
      useFocusEffect: (fn) => {
        focus = fn;
      },
    },
    '../lib/api': {
      api: {
        getSubscriptionStatus: async (token) => {
          tokens.push(token);
          return status('pro', Date.now() + 60000);
        },
      },
    },
    '../lib/subscription': library,
    '../store/authStore': { useAuthStore },
  });
  useSubscription();
  focus();
  await flush();
  auth = { ...auth, user: { uid: 'B', getIdToken: async () => 'B-token' } };
  listeners.forEach((fn) => fn());
  useSubscription();
  focus();
  await flush();
  oldToken.resolve('A-token');
  await flush();
  assert.deepEqual(tokens, ['B-token']);
  assert.equal(useSubscription().accountId, 'B');
  assert.equal(useSubscription().subscription.subscriptionTier, 'pro');
  auth = { ...auth, user: null, isDemo: true };
  listeners.forEach((fn) => fn());
  const demo = useSubscription();
  focus();
  await flush();
  assert.equal(demo.subscription.subscriptionTier, 'free');
  assert.equal(demo.subscription.isPremium, false);
  assert.deepEqual(tokens, ['B-token']);
  assert.equal(await demo.confirm(() => assert.fail('demo purchase')), 'account-changed');
});

function premiumHarness({ releaseReadyForTest = false } = {}) {
  const fixture = {
    response: status('free', null),
    buys: [],
    alerts: [],
    writes: [],
    buy: async () => {},
    restores: 0,
    restoreCalls: 0,
    offeringCalls: 0,
    backs: 0,
  };
  const store = new SubscriptionStore(
    async () => {
      if (fixture.response instanceof Error) throw fixture.response;
      return fixture.response;
    },
    () => now
  );
  store.setAccount('A');
  let stateIndex = 0,
    effectIndex = 0;
  const states = [],
    effects = [],
    queued = [];
  const jsx = (type, props) => ({ type, props });
  const products = loadSource('src/config/products.ts');
  const Screen = loadSource('src/screens/PremiumScreen.tsx', {
    react: {
      useRef: (initial) => {
        const i = stateIndex++;
        if (!(i in states)) states[i] = { current: initial };
        return states[i];
      },
      useState: (initial) => {
        const i = stateIndex++;
        if (!(i in states)) states[i] = initial;
        return [
          states[i],
          (value) => {
            states[i] = typeof value === 'function' ? value(states[i]) : value;
          },
        ];
      },
      useEffect: (callback, deps) => {
        const i = effectIndex++;
        if (!effects[i] || deps.some((v, j) => v !== effects[i][j])) queued.push(callback);
        effects[i] = deps;
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': new Proxy(
      { Alert: { alert: (...args) => fixture.alerts.push(args) }, Platform: { OS: 'ios' } },
      { get: (obj, key) => (key === 'StyleSheet' ? { create: (x) => x } : obj[key] || key) }
    ),
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '../store/authStore': {
      useAuthStore: () => ({
        isDemo: false,
        userProfile: { subscriptionTier: 'premium', isPremium: true },
        updateUser: (value) => fixture.writes.push(value),
      }),
    },
    '../services/iap': {
      loadSubscriptionProducts: async () => {
        fixture.offeringCalls++;
        return [{ id: products.SUBSCRIPTION_IDS[0], displayPrice: 'store-price' }];
      },
      buySubscription: async (id) => {
        fixture.buys.push(id);
        return fixture.buy();
      },
      restore: async () => {
        fixture.restoreCalls++;
        if (fixture.restores instanceof Error) throw fixture.restores;
        return fixture.restores;
      },
    },
    '../lib/subscriptionAvailability': releaseReadyForTest
      ? {
          areNewSubscriptionsAvailable: () => true,
          SUBSCRIPTIONS_UNAVAILABLE: 'SUBSCRIPTIONS_UNAVAILABLE',
        }
      : loadSource('src/lib/subscriptionAvailability.ts'),
    '../config/products': products,
    '../hooks/useSubscription': {
      useSubscription: () => ({
        ...store.getSnapshot(),
        refresh: store.refresh,
        confirm: store.confirm,
      }),
    },
    '../i18n': { t: (key) => key },
    '../lib/accountGate': { purchaseBlockedInDemo: () => false },
    '../theme/ThemeProvider': {
      useThemedStyles: (styles) => styles,
      useTheme: () => ({ color: (value) => value }),
    },
  }).default;
  const render = () => {
    stateIndex = effectIndex = 0;
    const tree = Screen({
      navigation: {
        goBack() {
          fixture.backs++;
        },
      },
    });
    queued.splice(0).forEach((fn) => fn());
    return tree;
  };
  return {
    fixture,
    store,
    render,
    boot: async () => {
      await store.refresh();
      render();
      await flush();
      return render();
    },
  };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function button(tree, label) {
  return nodes(tree).find(
    (node) =>
      node.type === 'TouchableOpacity' &&
      nodes(node.props.children).some((child) => child.props?.children === label)
  );
}

test('Premium loading state keeps its close button available before offerings resolve', () => {
  const h = premiumHarness({ releaseReadyForTest: true });
  const close = nodes(h.render()).find((node) => node.props?.accessibilityLabel === 'close');
  assert(close);
  close.props.onPress();
  assert.equal(h.fixture.backs, 1);
});

test('actual Premium screen ignores legacy profile grants and failed post-purchase status never writes or announces active access', async () => {
  const h = premiumHarness({ releaseReadyForTest: true });
  const tree = await h.boot();
  assert(button(tree, 'subscribe'), 'legacy premium flags must not select the active screen');
  h.fixture.response = new Error('503');
  await button(tree, 'subscribe').props.onPress();
  assert.equal(h.fixture.buys.length, 1);
  assert.deepEqual(h.fixture.writes, []);
  assert.equal(h.fixture.alerts[0][1], 'subscription_verification_pending');
  assert.equal(button(h.render(), 'subscribe').props.disabled, true);
});

test('actual Premium screen displays server Team after buying a Pro SKU; restore count with Free is not success', async () => {
  const h = premiumHarness({ releaseReadyForTest: true });
  const tree = await h.boot();
  h.fixture.response = status('team');
  await button(tree, 'subscribe').props.onPress();
  assert.equal(h.fixture.alerts[0][1], 'subscription_active_confirmed');
  assert(nodes(h.render()).some((node) => node.props?.children === 'Team'));
  assert.deepEqual(h.fixture.writes, []);
  const restored = premiumHarness();
  const restoreTree = await restored.boot();
  restored.fixture.restores = 3;
  await button(restoreTree, 'restore_purchases').props.onPress();
  assert.equal(restored.fixture.alerts[0][0], 'no_subscription_found');
});

test('actual Premium screen does not call a receipt error a declined payment or show old-account alerts', async () => {
  const h = premiumHarness({ releaseReadyForTest: true });
  const tree = await h.boot();
  h.fixture.buy = async () => {
    throw new Error('Receipt verification unavailable');
  };
  await button(tree, 'subscribe').props.onPress();
  assert.equal(h.fixture.alerts[0][0], 'subscription_unverified');
  assert.equal(h.fixture.alerts[0][1], 'subscription_unavailable');
  assert.equal(button(h.render(), 'subscribe').props.disabled, true);
  const changed = premiumHarness({ releaseReadyForTest: true });
  const changedTree = await changed.boot();
  const purchase = deferred();
  changed.fixture.buy = () => purchase.promise;
  const result = button(changedTree, 'subscribe').props.onPress();
  changed.store.setAccount('B');
  purchase.resolve();
  await result;
  assert.deepEqual(changed.fixture.alerts, []);
  assert.deepEqual(changed.fixture.writes, []);
});

test('failed restore keeps verified paid status and shows an explicit retry without claiming Free', async () => {
  for (const tier of ['free', 'team']) {
    const h = premiumHarness();
    h.fixture.response = status(tier);
    const tree = await h.boot();
    h.fixture.restores = Object.assign(new Error('Receipt verification incomplete'), {
      code: 'RESTORE_INCOMPLETE',
      stage: 'verification',
      verifiedCount: 1,
      failedCount: 1,
    });
    await button(tree, 'restore_purchases').props.onPress();
    const retryTree = h.render();
    assert.equal(h.fixture.alerts[0][0], 'subscription_unverified');
    assert(!nodes(retryTree).some((node) => node.props?.children === 'subscription_free'));
    assert.equal(h.store.getSnapshot().subscription.subscriptionTier, tier);
    if (tier === 'team') {
      assert(nodes(retryTree).some((node) => node.props?.children === 'Team'));
      assert(button(retryTree, 'manage_subscription'));
    }
    assert.equal(button(retryTree, 'retry').props.disabled, false);
    h.fixture.restores = 2;
    h.fixture.response = status('team');
    await button(retryTree, 'retry').props.onPress();
    assert.equal(h.fixture.restoreCalls, 2);
    assert.equal(h.fixture.alerts[1][1], 'subscription_active_confirmed');
    assert(button(h.render(), 'restore_purchases'));
    assert.deepEqual(h.fixture.buys, []);
    assert.deepEqual(h.fixture.writes, []);
  }
});

test('StoreKit restore failure offers retry and cannot become no subscription found', async () => {
  const h = premiumHarness();
  const tree = await h.boot();
  h.fixture.restores = Object.assign(new Error('Store unavailable'), {
    code: 'RESTORE_INCOMPLETE',
    stage: 'store',
  });
  await button(tree, 'restore_purchases').props.onPress();
  assert.equal(h.fixture.alerts[0][0], 'restore_failed');
  assert.equal(h.fixture.alerts[0][1], 'failed_to_restore_purchases_please_try_again');
  assert(button(h.render(), 'retry'));
});

test('double taps start one restore and changing account suppresses its success or error', async () => {
  for (const rejection of [false, true]) {
    const h = premiumHarness();
    const tree = await h.boot();
    const action = deferred();
    h.fixture.restores = action.promise;
    const onPress = button(tree, 'restore_purchases').props.onPress;
    const first = onPress();
    const second = onPress();
    await flush();
    const restoreCalls = h.fixture.restoreCalls;
    h.store.setAccount('B');
    rejection ? action.reject(new Error('Old account restore failed')) : action.resolve(1);
    await Promise.all([first, second]);
    assert.equal(restoreCalls, 1);
    assert.deepEqual(h.fixture.alerts, []);
    assert.equal(h.store.getSnapshot().subscription, null);
    assert.equal(button(h.render(), 'restore_purchases').props.disabled, false);
    assert.equal(button(h.render(), 'retry'), undefined);
  }
});

const unsupportedSalesLabels = [
  'advanced_ai_coaching',
  'personalized_guidance_from_our_ai_mentor',
  'unlimited_goals_habits',
  'advanced_analytics',
  'premium_challenges',
  'priority_support',
  'custom_themes',
  'get_unlimited_access_to_all_premium_features',
  'unlock_your_full_potential',
];

function assertNoSales(tree) {
  assert.equal(button(tree, 'subscribe'), undefined);
  const labels = nodes(tree).map((node) => node.props?.children);
  for (const label of unsupportedSalesLabels) {
    assert(!labels.includes(label), `Unsupported sales claim: ${label}`);
  }
  assert(!labels.includes('store-price'));
}

test('closed release exposes restore immediately without loading products or making sales promises', async () => {
  const h = premiumHarness();
  const initial = h.render();
  assertNoSales(initial);
  assert(button(initial, 'restore_purchases'));
  assert.equal(button(initial, 'restore_purchases').props.disabled, false);
  assert(nodes(initial).some((node) => node.props?.children === 'subscription_not_available'));
  assert.equal(h.fixture.offeringCalls, 0);
  const free = await h.boot();
  await button(free, 'restore_purchases').props.onPress();
  assert.equal(h.fixture.restoreCalls, 1);
  assert.equal(h.fixture.alerts[0][0], 'no_subscription_found');
  assert.deepEqual(h.fixture.buys, []);
  assert.deepEqual(h.fixture.writes, []);
});

test('closed sales preserve verified paid status, management and restore even with AI entitlement true', async () => {
  const h = premiumHarness();
  h.fixture.response = status('team');
  const tree = await h.boot();
  assert.equal(h.fixture.response.features.aiCoaching, true);
  assertNoSales(tree);
  assert(nodes(tree).some((node) => node.props?.children === 'Team'));
  assert(nodes(tree).some((node) => node.props?.children === 'subscription_active_confirmed'));
  button(tree, 'manage_subscription').props.onPress();
  assert.equal(h.fixture.alerts[0][0], 'manage_subscription');
  await button(tree, 'restore_purchases').props.onPress();
  assert.equal(h.fixture.restoreCalls, 1);
  assert.equal(h.fixture.alerts[1][1], 'subscription_active_confirmed');
  assert.equal(h.fixture.offeringCalls, 0);
  assert.deepEqual(h.fixture.buys, []);
  assert.deepEqual(h.fixture.writes, []);
});

test('failed entitlement reads do not hide restore or convert unknown access into Free', async () => {
  const h = premiumHarness();
  h.fixture.response = new Error('Status unavailable');
  const tree = await h.boot();
  assertNoSales(tree);
  assert.equal(button(tree, 'restore_purchases').props.disabled, false);
  assert(nodes(tree).some((node) => node.props?.children === 'subscription_unavailable'));
  assert(!nodes(tree).some((node) => node.props?.children === 'subscription_free'));
  h.fixture.response = status('pro');
  await button(tree, 'restore_purchases').props.onPress();
  assert.equal(h.fixture.restoreCalls, 1);
  assert(nodes(h.render()).some((node) => node.props?.children === 'Pro'));
});

test('pre-StoreKit policy rejection is not presented as an uncertain payment', async () => {
  const h = premiumHarness({ releaseReadyForTest: true });
  h.fixture.buy = async () => {
    throw Object.assign(new Error('Release closed'), { code: 'SUBSCRIPTIONS_UNAVAILABLE' });
  };
  const tree = await h.boot();
  await button(tree, 'subscribe').props.onPress();
  assert.deepEqual(h.fixture.alerts, [
    ['subscription_not_available', 'in_app_purchases_are_being_configured_please'],
  ]);
  assert.equal(button(h.render(), 'subscribe').props.disabled, false);
  assert(
    !nodes(h.render()).some((node) => node.props?.children === 'subscription_verification_pending')
  );
});

test('all seven locales contain the same seven non-empty subscription status messages', () => {
  const keys = [
    'subscription_checking',
    'subscription_unverified',
    'subscription_unavailable',
    'subscription_check_again',
    'subscription_verification_pending',
    'subscription_active_confirmed',
    'subscription_free',
  ];
  for (const locale of ['en', 'tr', 'de', 'es', 'fr', 'it', 'ja']) {
    const catalog = loadSource(`src/i18n/${locale}.ts`)[locale];
    for (const key of keys) assert.equal(typeof catalog[key], 'string', `${locale}/${key}`);
    for (const key of keys) assert(catalog[key].trim(), `${locale}/${key}`);
  }
});

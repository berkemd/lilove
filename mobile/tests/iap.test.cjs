const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

// Run the shipped modules with controlled StoreKit, account and network boundaries.
function loadSource(relative, imports = {}, globals = {}) {
  const filename = path.join(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), source)(
    (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    ...Object.values(globals)
  );
  return module.exports;
}

const products = loadSource('src/config/products.ts');
const subscriptionAvailability = loadSource('src/lib/subscriptionAvailability.ts');
const coinId = products.COIN_IDS[0];
const subscriptionId = products.SUBSCRIPTION_IDS[0];
const accountA = 'bdd9fe22-f678-486b-96a6-8fdff0d7d905';
const accountB = '920a6410-23d1-4c86-a3f6-55f2ef54c8b8';
const demoToken = 'demo-account';
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

function harness({ releaseReadyForTest = false } = {}) {
  const state = {
    token: 'signed-in-account',
    accountResponse: { appAccountToken: accountA },
    verify: async () => ({ success: true }),
    available: [],
    accountCalls: [],
    verifyCalls: [],
    requests: [],
    finishes: [],
    events: [],
    timers: new Map(),
    availableCalls: 0,
    removedListeners: 0,
    closedConnections: 0,
  };
  let timerId = 0;
  let onPurchase;
  let onError;
  let requestSignal = deferred();
  const iap = loadSource(
    'src/services/iap.ts',
    {
      'expo-iap': {
        initConnection: async () => {},
        endConnection: async () => state.closedConnections++,
        requestProducts: async () => [],
        requestPurchase: async (request) => {
          state.events.push('request');
          state.requests.push(request);
          const signal = requestSignal;
          requestSignal = deferred();
          signal.resolve(request);
          if (state.requestError) throw state.requestError;
        },
        finishTransaction: async (transaction) => {
          state.events.push('finish');
          state.finishes.push(transaction);
        },
        getAvailablePurchases: async () => {
          state.availableCalls++;
          return state.available;
        },
        purchaseUpdatedListener: (listener) => {
          onPurchase = listener;
          return { remove: () => state.removedListeners++ };
        },
        purchaseErrorListener: (listener) => {
          onError = listener;
          return { remove: () => state.removedListeners++ };
        },
      },
      'react-native': { Platform: { OS: 'ios' } },
      '../lib/api': {
        api: {
          getIapAccountToken: async (productId) => {
            state.events.push('account');
            state.accountCalls.push(productId);
            if (state.accountError) throw state.accountError;
            return state.accountResponse;
          },
          verifyPurchase: async (transactionId) => {
            state.events.push('verify');
            state.verifyCalls.push(transactionId);
            return state.verify(transactionId);
          },
        },
      },
      '../config/products': products,
      '../lib/subscriptionAvailability': releaseReadyForTest
        ? { assertNewSubscriptionAvailable() {} }
        : subscriptionAvailability,
      './tokenManager': { tokenManager: { getToken: async () => state.token } },
      '../lib/demoData': { DEMO_TOKEN: demoToken },
    },
    {
      __DEV__: false,
      setTimeout: (callback) => {
        state.timers.set(++timerId, callback);
        return timerId;
      },
      clearTimeout: (id) => state.timers.delete(id),
    }
  );
  return {
    state,
    iap,
    nextRequest: () => requestSignal.promise,
    purchase: (value) => onPurchase(value),
    error: (value) => onError(value),
  };
}

test('API sends the selected product during account preflight and only the transaction ID during verification', async () => {
  const calls = [];
  const { api } = loadSource(
    'src/lib/api.ts',
    {
      'expo-constants': { default: { expoConfig: { extra: { apiUrl: 'https://test.invalid' } } } },
      '../services/tokenManager': { tokenManager: { getToken: async () => 'session-token' } },
      './demoData': { DEMO_TOKEN: demoToken },
      '../i18n': { t: (key) => key },
      './habits': { createHabitsApi: () => ({}) },
    },
    {
      console: { log: () => {} },
      fetch: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          json: async () =>
            calls.length === 1 ? { appAccountToken: accountA } : { success: true },
        };
      },
    }
  );
  assert.deepEqual(await api.getIapAccountToken(coinId), { appAccountToken: accountA });
  assert.deepEqual(await api.verifyPurchase('apple-transaction'), { success: true });
  assert.deepEqual(
    calls.map(({ url, options }) => ({
      url,
      method: options.method,
      body: JSON.parse(options.body),
      authorization: options.headers.Authorization,
    })),
    [
      {
        url: 'https://test.invalid/api/iap/account-token',
        method: 'POST',
        body: { productId: coinId },
        authorization: 'Bearer session-token',
      },
      {
        url: 'https://test.invalid/api/subscription/verify',
        method: 'POST',
        body: { transactionId: 'apple-transaction' },
        authorization: 'Bearer session-token',
      },
    ]
  );
});

test('demo purchase and restore stop before the account endpoint or StoreKit', async () => {
  const { iap, state } = harness();
  state.token = demoToken;
  await assert.rejects(iap.buyCoins(coinId), { code: 'ACCOUNT_REQUIRED' });
  await assert.rejects(iap.buySubscription(subscriptionId), { code: 'ACCOUNT_REQUIRED' });
  await assert.rejects(iap.restore(), { code: 'ACCOUNT_REQUIRED' });
  assert.deepEqual(state.accountCalls, []);
  assert.deepEqual(state.requests, []);
  assert.equal(state.availableCalls, 0);
});

test('missing or invalid account UUIDs cannot start a charge or a pending purchase', async () => {
  for (const response of [
    undefined,
    null,
    {},
    { appAccountToken: null },
    { appAccountToken: 'not-a-uuid' },
    { appAccountToken: '00000000-0000-0000-0000-000000000000' },
    { appAccountToken: `${accountA} ` },
  ]) {
    const { iap, state } = harness();
    state.accountResponse = response;
    await assert.rejects(iap.buyCoins(coinId), /account token is unavailable/);
    assert.deepEqual(state.requests, []);
    assert.equal(state.timers.size, 0);
  }
});

test('failed account preflight stops before StoreKit and permits a later retry', async () => {
  const h = harness();
  await h.iap.initIAP();
  h.state.accountError = new Error('Payment service unavailable');
  await assert.rejects(h.iap.buyCoins(coinId), /Payment service unavailable/);
  assert.deepEqual(h.state.requests, []);
  assert.equal(h.state.timers.size, 0);
  h.state.accountError = undefined;
  const requested = h.nextRequest();
  const buying = h.iap.buyCoins(coinId);
  await requested;
  await h.purchase({ productId: coinId, transactionId: 'retry' });
  await buying;
  assert.equal(h.state.finishes.length, 1);
});

test('coin and subscription requests fetch a fresh account token and stay pending until verified', async () => {
  // Keep the existing transaction lifecycle test independent of the closed
  // release policy. Real-policy tests below prove new sales remain blocked.
  const h = harness({ releaseReadyForTest: true });
  await h.iap.initIAP();
  for (const [productId, kind, accountToken] of [
    [coinId, 'inapp', accountA],
    [subscriptionId, 'subs', accountB],
  ]) {
    h.state.accountResponse = { appAccountToken: accountToken };
    const verification = deferred();
    h.state.verify = () => verification.promise;
    const requested = h.nextRequest();
    let completed = false;
    const buying = (
      kind === 'inapp' ? h.iap.buyCoins(productId) : h.iap.buySubscription(productId)
    ).then(() => {
      completed = true;
    });
    assert.deepEqual(await requested, {
      request: { ios: { sku: productId, appAccountToken: accountToken } },
      type: kind,
    });
    assert.equal(completed, false);
    const before = h.state.finishes.length;
    const purchase = { productId, transactionId: `transaction-${kind}` };
    const received = h.purchase(purchase);
    assert.equal(h.state.finishes.length, before);
    verification.resolve({ success: true });
    await received;
    await buying;
    assert.deepEqual(h.state.finishes[before], { purchase, isConsumable: kind === 'inapp' });
    assert.equal(h.state.timers.size, 0);
  }
  assert.deepEqual(h.state.accountCalls, [coinId, subscriptionId]);
  assert.deepEqual(h.state.events, [
    'account',
    'request',
    'verify',
    'finish',
    'account',
    'request',
    'verify',
    'finish',
  ]);
});

test('new subscriptions stop before account preflight, StoreKit and pending timers', async () => {
  const { iap, state } = harness();
  await iap.initIAP();
  assert.equal(subscriptionAvailability.areNewSubscriptionsAvailable(), false);
  await assert.rejects(iap.buySubscription(subscriptionId), {
    code: 'SUBSCRIPTIONS_UNAVAILABLE',
  });
  // An incorrect caller must not bypass closure by using the coin wrapper.
  await assert.rejects(iap.buyCoins(subscriptionId), {
    code: 'SUBSCRIPTIONS_UNAVAILABLE',
  });
  assert.deepEqual(state.accountCalls, []);
  assert.deepEqual(state.requests, []);
  assert.deepEqual(state.verifyCalls, []);
  assert.equal(state.timers.size, 0);
});

test('closed new sales do not block delivery and verification of existing subscription transactions', async () => {
  const h = harness();
  await h.iap.initIAP();
  const transaction = { productId: subscriptionId, transactionId: 'existing-subscription' };
  h.state.verify = async () => {
    throw new Error('Verification offline');
  };
  await h.purchase(transaction);
  assert.deepEqual(h.state.finishes, []);
  h.state.verify = async () => ({ success: true });
  await h.purchase(transaction);
  assert.deepEqual(h.state.verifyCalls, ['existing-subscription', 'existing-subscription']);
  assert.deepEqual(h.state.finishes, [{ purchase: transaction, isConsumable: false }]);
  assert.deepEqual(h.state.requests, []);
});

test('HTTP success without explicit success true rejects the purchase and never finishes StoreKit', async () => {
  for (const response of [
    undefined,
    null,
    {},
    { success: false },
    { success: 'true' },
    { success: 1 },
  ]) {
    const h = harness();
    await h.iap.initIAP();
    h.state.verify = async () => response;
    const requested = h.nextRequest();
    const rejected = assert.rejects(h.iap.buyCoins(coinId), /verification was not confirmed/);
    await requested;
    await h.purchase({ productId: coinId, transactionId: 'unconfirmed' });
    await rejected;
    assert.deepEqual(h.state.finishes, []);
    assert.equal(h.state.timers.size, 0);
  }
});

test('a verification network failure leaves the transaction unfinished for a later StoreKit replay', async () => {
  const h = harness();
  await h.iap.initIAP();
  h.state.verify = async () => {
    throw new Error('Network lost');
  };
  const requested = h.nextRequest();
  const rejected = assert.rejects(h.iap.buyCoins(coinId), /Network lost/);
  await requested;
  const purchase = { productId: coinId, transactionId: 'replayed' };
  await h.purchase(purchase);
  await rejected;
  assert.deepEqual(h.state.finishes, []);
  h.state.verify = async () => ({ success: true });
  await h.purchase(purchase);
  assert.deepEqual(h.state.verifyCalls, ['replayed', 'replayed']);
  assert.equal(h.state.finishes.length, 1);
});

test('restore skips coins and only counts explicitly confirmed subscription transactions', async () => {
  const { iap, state } = harness();
  state.available = [
    { productId: coinId, transactionId: 'coin' },
    { productId: subscriptionId },
    ...['valid-a', 'invalid', 'ambiguous', 'offline', 'valid-b'].map((transactionId) => ({
      productId: subscriptionId,
      transactionId,
    })),
  ];
  state.verify = async (id) => {
    if (id === 'offline') throw new Error('Offline');
    if (id === 'ambiguous') return {};
    return { success: id.startsWith('valid-') };
  };
  assert.equal(await iap.restore(), 2);
  assert.deepEqual(state.verifyCalls, ['valid-a', 'invalid', 'ambiguous', 'offline', 'valid-b']);
  assert.deepEqual(state.finishes, []);
  assert.deepEqual(state.accountCalls, []);
});

test('StoreKit rejection and cancellation clear pending timers without completing transactions', async () => {
  const h = harness();
  await h.iap.initIAP();
  h.state.requestError = new Error('Store unavailable');
  await assert.rejects(h.iap.buyCoins(coinId), /Store unavailable/);
  assert.equal(h.state.timers.size, 0);
  h.state.requestError = undefined;
  const requested = h.nextRequest();
  const rejected = assert.rejects(h.iap.buyCoins(coinId), /Cancelled/);
  await requested;
  h.error(new Error('Cancelled'));
  await rejected;
  assert.equal(h.state.timers.size, 0);
  assert.deepEqual(h.state.finishes, []);
  await h.iap.closeIAP();
  assert.equal(h.state.removedListeners, 2);
  assert.equal(h.state.closedConnections, 1);
});

test('deployment API override routes authenticated requests to staging without changing the production fallback', async () => {
  for (const scenario of [
    {
      configured: 'https://lilove.org',
      override: 'https://staging.invalid',
      expected: 'https://staging.invalid',
    },
    {
      configured: 'https://configured.invalid',
      override: '',
      expected: 'https://configured.invalid',
    },
    { configured: undefined, override: undefined, expected: 'https://lilove.org' },
  ]) {
    const calls = [];
    const { api } = loadSource(
      'src/lib/api.ts',
      {
        'expo-constants': { default: { expoConfig: { extra: { apiUrl: scenario.configured } } } },
        '../services/tokenManager': { tokenManager: { getToken: async () => 'session-token' } },
        './demoData': { DEMO_TOKEN: demoToken },
        '../i18n': { t: (key) => key },
        './habits': { createHabitsApi: () => ({}) },
      },
      {
        process: { env: { EXPO_PUBLIC_API_URL: scenario.override } },
        console: { log: () => {} },
        fetch: async (url, options) => {
          calls.push({ url, authorization: options.headers.Authorization });
          return { ok: true, json: async () => ({ appAccountToken: accountA }) };
        },
      }
    );
    await api.getIapAccountToken(coinId);
    assert.deepEqual(calls, [
      { url: `${scenario.expected}/api/iap/account-token`, authorization: 'Bearer session-token' },
    ]);
  }
});

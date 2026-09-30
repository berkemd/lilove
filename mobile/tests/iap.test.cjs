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
const coinAvailability = loadSource('src/lib/coinAvailability.ts');
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

function harness({ releaseReadyForTest = false, coinSalesReadyForTest = false } = {}) {
  const state = {
    token: 'signed-in-account',
    accountResponse: { appAccountToken: accountA },
    verify: async () => ({ success: true }),
    available: [],
    accountCalls: [],
    verifyCalls: [],
    verificationTokens: [],
    tokenListeners: new Set(),
    requests: [],
    finishes: [],
    events: [],
    timers: new Map(),
    availableCalls: 0,
    initCalls: 0,
    listeners: 0,
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
        initConnection: async () => {
          state.initCalls++;
          if (state.initError) throw state.initError;
          if (state.initPending) await state.initPending;
          return state.canMakePayments ?? true;
        },
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
          if (state.availableError) throw state.availableError;
          if (state.availablePending) await state.availablePending;
          return state.available;
        },
        purchaseUpdatedListener: (listener) => {
          state.listeners++;
          onPurchase = listener;
          return { remove: () => state.removedListeners++ };
        },
        purchaseErrorListener: (listener) => {
          state.listeners++;
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
          verifyPurchase: async (transactionId, authorizationToken) => {
            state.events.push('verify');
            state.verifyCalls.push(transactionId);
            state.verificationTokens.push(authorizationToken ?? state.token);
            return state.verify(transactionId, authorizationToken);
          },
        },
      },
      '../config/products': products,
      '../lib/coinAvailability': coinSalesReadyForTest
        ? { assertNewCoinPurchaseAvailable() {} }
        : coinAvailability,
      '../lib/subscriptionAvailability': releaseReadyForTest
        ? { assertNewSubscriptionAvailable() {} }
        : subscriptionAvailability,
      './tokenManager': {
        tokenManager: {
          getToken: async () => state.token,
          onTokenChange: (listener) => {
            state.tokenListeners.add(listener);
            return () => state.tokenListeners.delete(listener);
          },
        },
      },
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
  let sessionToken = 'session-token';
  const { api } = loadSource(
    'src/lib/api.ts',
    {
      'expo-constants': { default: { expoConfig: { extra: { apiUrl: 'https://test.invalid' } } } },
      '../services/tokenManager': { tokenManager: { getToken: async () => sessionToken } },
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
  sessionToken = 'new-account-session';
  assert.deepEqual(await api.verifyPurchase('pinned-restore', 'session-token'), { success: true });
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
      {
        url: 'https://test.invalid/api/subscription/verify',
        method: 'POST',
        body: { transactionId: 'pinned-restore' },
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
    const { iap, state } = harness({ coinSalesReadyForTest: true });
    state.accountResponse = response;
    await assert.rejects(iap.buyCoins(coinId), /account token is unavailable/);
    assert.deepEqual(state.requests, []);
    assert.equal(state.timers.size, 0);
  }
});

test('failed account preflight stops before StoreKit and permits a later retry', async () => {
  const h = harness({ coinSalesReadyForTest: true });
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
  const h = harness({ releaseReadyForTest: true, coinSalesReadyForTest: true });
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

test('closed new coin sales block every pack and unknown inapp SKU before account, StoreKit or timers', async () => {
  const { iap, state } = harness();
  await iap.initIAP();
  state.accountError = new Error('Closed coin sales reached account preflight');
  assert.equal(coinAvailability.areNewCoinPurchasesAvailable(), false);
  for (const id of [...products.COIN_IDS, 'unknown-inapp-sku']) {
    await assert.rejects(iap.buyCoins(id), { code: 'COINS_UNAVAILABLE' });
  }
  assert.deepEqual(state.accountCalls, []);
  assert.deepEqual(state.requests, []);
  assert.deepEqual(state.verifyCalls, []);
  assert.equal(state.timers.size, 0);
  // Even a caller using the subscription wrapper cannot bypass the coin gate.
  const wrongWrapper = harness({ releaseReadyForTest: true });
  await assert.rejects(wrongWrapper.iap.buySubscription(coinId), { code: 'COINS_UNAVAILABLE' });
  assert.deepEqual(wrongWrapper.state.accountCalls, []);
  assert.deepEqual(wrongWrapper.state.requests, []);
});

test('closed new coin sales preserve unfinished consumable verification and StoreKit replay', async () => {
  const h = harness();
  await h.iap.initIAP();
  const existing = { productId: coinId, transactionId: 'already-paid-coin' };
  h.state.verify = async () => {
    throw new Error('Verification offline');
  };
  await h.purchase(existing);
  assert.deepEqual(h.state.finishes, []);
  h.state.verify = async () => ({ success: true });
  await h.purchase(existing);
  assert.deepEqual(h.state.verifyCalls, ['already-paid-coin', 'already-paid-coin']);
  assert.deepEqual(h.state.finishes, [{ purchase: existing, isConsumable: true }]);
  assert.deepEqual(h.state.accountCalls, []);
  assert.deepEqual(h.state.requests, []);
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
    const h = harness({ coinSalesReadyForTest: true });
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
  const h = harness({ coinSalesReadyForTest: true });
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

test('restore tries every receipt, reports partial verification and safely retries confirmed receipts', async () => {
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
  await assert.rejects(iap.restore(), {
    code: 'RESTORE_INCOMPLETE',
    stage: 'verification',
    verifiedCount: 2,
    failedCount: 4,
  });
  assert.deepEqual(state.verifyCalls, ['valid-a', 'invalid', 'ambiguous', 'offline', 'valid-b']);
  state.available = state.available.filter((purchase) => purchase.transactionId);
  state.verify = async () => ({ success: true });
  assert.equal(await iap.restore(), 5);
  assert.deepEqual(state.verifyCalls.slice(5), [
    'valid-a',
    'invalid',
    'ambiguous',
    'offline',
    'valid-b',
  ]);
  assert.deepEqual(state.finishes, []);
  assert.deepEqual(state.accountCalls, []);
  assert.deepEqual(state.requests, []);
});

test('restore cannot turn unverified receipts into an empty successful restore', async () => {
  for (const verify of [
    async () => {
      throw new Error('Network request failed');
    },
    async () => ({ success: false }),
    async () => ({}),
  ]) {
    const { iap, state } = harness();
    state.available = [{ productId: subscriptionId, transactionId: 'existing-subscription' }];
    state.verify = verify;
    await assert.rejects(iap.restore(), {
      code: 'RESTORE_INCOMPLETE',
      stage: 'verification',
      verifiedCount: 0,
      failedCount: 1,
    });
    assert.deepEqual(state.finishes, []);
  }
});

test('only an actual empty StoreKit list is a successful empty restore', async () => {
  for (const available of [null, undefined, {}]) {
    const { iap, state } = harness();
    state.available = available;
    await assert.rejects(iap.restore(), { code: 'RESTORE_INCOMPLETE', stage: 'store' });
    assert.deepEqual(state.verifyCalls, []);
  }
  const { iap, state } = harness();
  assert.equal(await iap.restore(), 0);
  assert.equal(state.initCalls, 1);
  assert.equal(state.availableCalls, 1);
});

test('restore retries a failed StoreKit connection or query without opening a purchase', async () => {
  for (const boundary of ['initError', 'availableError']) {
    const { iap, state } = harness();
    state[boundary] = new Error('Store unavailable');
    await assert.rejects(iap.restore(), { code: 'RESTORE_INCOMPLETE', stage: 'store' });
    if (boundary === 'initError') assert.equal(state.availableCalls, 0);
    state[boundary] = null;
    assert.equal(await iap.restore(), 0);
    assert.equal(state.initCalls, boundary === 'initError' ? 2 : 1);
    assert.equal(state.listeners, 2);
    assert.deepEqual(state.requests, []);
  }
});

test('startup and concurrent restores share initialization but retain independent receipt results', async () => {
  const { iap, state } = harness();
  const connection = deferred();
  state.initPending = connection.promise;
  state.available = [{ productId: subscriptionId, transactionId: 'existing-subscription' }];
  let attempts = 0;
  state.verify = async () => {
    if (++attempts === 1) throw new Error('Network request failed');
    return { success: true };
  };
  const startup = iap.initIAP();
  const failed = assert.rejects(iap.restore(), { code: 'RESTORE_INCOMPLETE' });
  const retried = iap.restore();
  connection.resolve();
  await startup;
  await failed;
  assert.equal(await retried, 1);
  assert.equal(state.initCalls, 1);
  assert.equal(state.listeners, 2);
  assert.deepEqual(state.finishes, []);
});

test('guest and demo restore are rejected before StoreKit initialization or enumeration', async () => {
  for (const token of [null, '', demoToken]) {
    const { iap, state } = harness();
    state.token = token;
    await assert.rejects(iap.restore(), { code: 'ACCOUNT_REQUIRED' });
    assert.equal(state.initCalls, 0);
    assert.equal(state.availableCalls, 0);
    assert.deepEqual(state.verifyCalls, []);
  }
});

test('StoreKit payment restrictions do not prevent restoring an existing subscription', async () => {
  const { iap, state } = harness();
  // expo-iap 2.8.5 initializes its store even when AppStore.canMakePayments is false.
  state.canMakePayments = false;
  state.available = [{ productId: subscriptionId, transactionId: 'existing-subscription' }];
  assert.equal(await iap.restore(), 1);
  assert.deepEqual(state.verifyCalls, ['existing-subscription']);
  assert.deepEqual(state.requests, []);
});

test('account changes during restore stop later receipts and entitlement readback', async () => {
  for (const phase of ['initialization', 'enumeration', 'first-receipt', 'last-receipt']) {
    const { iap, state } = harness();
    const boundary = deferred();
    const reached = deferred();
    state.available = ['first', 'last'].map((transactionId) => ({
      productId: subscriptionId,
      transactionId,
    }));
    if (phase === 'initialization') state.initPending = boundary.promise;
    if (phase === 'enumeration') state.availablePending = boundary.promise;
    state.verify = async (transactionId) => {
      if (transactionId === (phase === 'first-receipt' ? 'first' : 'last')) {
        reached.resolve();
        await boundary.promise;
      }
      return { success: true };
    };
    const { SubscriptionStore } = loadSource('src/lib/subscription.ts');
    let reads = 0;
    const store = new SubscriptionStore(async () => {
      reads++;
    });
    store.setAccount('A');
    const restoring = assert.rejects(store.confirm(iap.restore), {
      code: 'RESTORE_INCOMPLETE',
      stage: 'account',
    });
    if (phase === 'initialization' || phase === 'enumeration') {
      await new Promise((resolve) => setImmediate(resolve));
    } else {
      await reached.promise;
    }
    state.token = 'another-account-session';
    state.tokenListeners.forEach((listener) => listener(state.token));
    boundary.resolve();
    await restoring;
    assert.equal(reads, 0);
    assert.equal(state.availableCalls, phase === 'initialization' ? 0 : 1);
    assert.deepEqual(
      state.verifyCalls,
      phase === 'initialization' || phase === 'enumeration'
        ? []
        : phase === 'first-receipt'
          ? ['first']
          : ['first', 'last']
    );
    assert(state.verificationTokens.every((token) => token === 'signed-in-account'));
    assert.equal(state.tokenListeners.size, 0);
  }
});

test('a token switch back to the original token still aborts the old restore session', async () => {
  const { iap, state } = harness();
  state.available = [{ productId: subscriptionId, transactionId: 'first' }];
  state.verify = async () => {
    state.tokenListeners.forEach((listener) => listener('other-session'));
    state.tokenListeners.forEach((listener) => listener(state.token));
    return { success: true };
  };
  await assert.rejects(iap.restore(), { code: 'RESTORE_INCOMPLETE', stage: 'account' });
  assert.equal(state.tokenListeners.size, 0);
});

test('StoreKit rejection and cancellation clear pending timers without completing transactions', async () => {
  const h = harness({ coinSalesReadyForTest: true });
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

test('canonical Expo origin takes precedence while legacy API fallbacks preserve authentication', async () => {
  for (const scenario of [
    {
      configured: 'https://lilove.org',
      override: 'https://staging.invalid',
      expected: 'https://lilove.org',
    },
    {
      configured: 'https://configured.invalid',
      override: '',
      expected: 'https://configured.invalid',
    },
    {
      configured: undefined,
      override: 'https://staging.invalid',
      expected: 'https://staging.invalid',
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

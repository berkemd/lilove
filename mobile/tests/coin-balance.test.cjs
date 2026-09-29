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

const library = loadSource('src/lib/coinBalance.ts');
const { CoinBalanceStore, parseCoinBalance } = library;
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise(setImmediate);

test('accepts actual zero and server balance, rejects malformed values without inventing zero', async () => {
  assert.equal(parseCoinBalance({ balance: 0 }), 0);
  assert.equal(parseCoinBalance({ balance: 1000 }), 1000);
  for (const value of [
    null,
    {},
    [],
    { balance: '1000' },
    { balance: -1 },
    { balance: NaN },
    { balance: 1.5 },
    { balance: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    assert.throws(() => parseCoinBalance(value));
    const store = new CoinBalanceStore(async () => value);
    store.setAccount('A');
    assert.equal(await store.refresh(), null);
    assert.deepEqual(store.getSnapshot(), { accountKey: 'A', status: 'error', balance: null });
  }
});

test('concurrent readers share one request and clear the cached balance while loading or failed', async () => {
  let response = Promise.resolve({ balance: 1000 }),
    calls = 0;
  const store = new CoinBalanceStore(() => {
    calls++;
    return response;
  });
  store.setAccount('A');
  await store.refresh();
  const next = deferred();
  response = next.promise;
  const first = store.refresh();
  assert.equal(store.refresh(), first);
  assert.equal(store.getSnapshot().balance, null);
  assert.equal(store.getSnapshot().status, 'loading');
  next.reject(new Error('offline'));
  assert.equal(await first, null);
  assert.equal(calls, 2);
  assert.equal(store.getSnapshot().status, 'error');
  assert.equal(store.getSnapshot().balance, null);
});

test('late previous account success or error cannot overwrite a different account or demo', async () => {
  for (const fails of [false, true]) {
    const oldResponse = deferred();
    const store = new CoinBalanceStore((key) =>
      key === 'A' ? oldResponse.promise : Promise.resolve({ balance: key === 'demo' ? 1250 : 700 })
    );
    store.setAccount('A');
    const old = store.refresh();
    await flush();
    store.setAccount('demo');
    assert.equal(store.getSnapshot().balance, null);
    await store.refresh();
    assert.equal(store.getSnapshot().balance, 1250);
    store.setAccount('B');
    await store.refresh();
    fails ? oldResponse.reject(new Error('old error')) : oldResponse.resolve({ balance: 1000 });
    await old;
    assert.deepEqual(store.getSnapshot(), { accountKey: 'B', status: 'ready', balance: 700 });
  }
});

test('logout and re-login with the same UID invalidates the previous session response', async () => {
  const oldResponse = deferred();
  let calls = 0;
  const store = new CoinBalanceStore(() =>
    ++calls === 1 ? oldResponse.promise : Promise.resolve({ balance: 400 })
  );
  store.setAccount('A');
  const old = store.refresh();
  await flush();
  store.setAccount(null);
  assert.equal(store.getSnapshot().balance, null);
  store.setAccount('A');
  await store.refresh();
  oldResponse.resolve({ balance: 1000 });
  await old;
  assert.equal(store.getSnapshot().balance, 400);
});

test('successful unlock or purchase refreshes the server value and supersedes an older request', async () => {
  for (const serverBalance of [750, 1500]) {
    const oldResponse = deferred();
    let reads = 0,
      actions = 0;
    const store = new CoinBalanceStore(() =>
      ++reads === 1 ? oldResponse.promise : Promise.resolve({ balance: serverBalance })
    );
    store.setAccount('A');
    const old = store.refresh();
    await flush();
    assert.equal(
      await store.confirm(async () => {
        actions++;
        return { balance: 999999 };
      }),
      'updated'
    );
    assert.equal(actions, 1);
    assert.equal(store.getSnapshot().balance, serverBalance);
    oldResponse.resolve({ balance: 1000 });
    await old;
    assert.equal(store.getSnapshot().balance, serverBalance);
  }
});

test('failed verification after a successful action remains unknown; failed actions are not credited', async () => {
  let reads = 0;
  const store = new CoinBalanceStore(async () => {
    reads++;
    throw new Error('offline');
  });
  store.setAccount('A');
  assert.equal(await store.confirm(async () => ({ balance: 999 })), 'unverified');
  assert.equal(store.getSnapshot().balance, null);
  await assert.rejects(
    store.confirm(async () => {
      throw new Error('denied');
    }),
    /denied/
  );
  assert.equal(reads, 1);
});

test('account changes during an action or final read suppress old success/errors and cannot refresh the new account', async () => {
  for (const rejection of [false, true]) {
    const action = deferred();
    const store = new CoinBalanceStore(() => assert.fail('unexpected new-account read'));
    store.setAccount('A');
    const result = store.confirm(() => action.promise);
    store.setAccount('B');
    rejection ? action.reject(new Error('old error')) : action.resolve();
    assert.equal(await result, 'account-changed');
    assert.equal(store.getSnapshot().balance, null);
  }
  const response = deferred();
  const store = new CoinBalanceStore(() => response.promise);
  store.setAccount('A');
  const result = store.confirm(async () => {});
  await flush();
  store.setAccount(null);
  response.resolve({ balance: 1000 });
  assert.equal(await result, 'account-changed');
  assert.equal(store.getSnapshot().balance, null);
});

test('unauthenticated state cannot read balance or initiate an action', async () => {
  const store = new CoinBalanceStore(() => assert.fail('unexpected read'));
  assert.equal(await store.refresh(), null);
  assert.equal(await store.confirm(() => assert.fail('unexpected purchase')), 'account-changed');
});

test('actual API binds the scoped token and actual demo balance stays offline', async () => {
  const calls = [];
  const demo = loadSource('src/lib/demoData.ts', { '../i18n': { t: (key) => key } });
  const { api } = loadSource(
    'src/lib/api.ts',
    {
      'expo-constants': { default: { expoConfig: { extra: { apiUrl: 'https://test.invalid' } } } },
      '../services/tokenManager': { tokenManager: { getToken: async () => 'other-user-token' } },
      './demoData': demo,
      '../i18n': { t: (key) => key },
      './habits': { createHabitsApi: () => ({}) },
    },
    {
      console: { log() {} },
      fetch: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, json: async () => ({ balance: 1000 }) };
      },
    }
  );
  assert.equal((await api.getCoinBalance('scoped-user-token')).balance, 1000);
  assert.equal(calls[0].url, 'https://test.invalid/api/coin-balance');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer scoped-user-token');
  assert.equal((await api.getCoinBalance(demo.DEMO_TOKEN)).balance, 1250);
  assert.equal(calls.length, 1);
});

test('actual hook scopes token lookup, shares one balance and refreshes only while focused', async () => {
  const oldToken = deferred();
  let auth = {
    user: { uid: 'A', getIdToken: () => oldToken.promise },
    isAuthenticated: true,
    isDemo: false,
  };
  const listeners = [],
    tokens = [],
    activeListeners = new Set();
  let focus,
    response = 1000;
  const useAuthStore = Object.assign(() => auth, {
    getState: () => auth,
    subscribe: (callback) => listeners.push(callback),
  });
  const { useCoinBalance } = loadSource('src/hooks/useCoinBalance.ts', {
    react: { useCallback: (fn) => fn, useSyncExternalStore: (_, get) => get() },
    'react-native': {
      AppState: {
        addEventListener: (_, callback) => {
          activeListeners.add(callback);
          return { remove: () => activeListeners.delete(callback) };
        },
      },
    },
    '@react-navigation/native': {
      useFocusEffect: (fn) => {
        focus = fn;
      },
    },
    '../lib/api': {
      api: {
        getCoinBalance: async (token) => {
          tokens.push(token);
          return { balance: response };
        },
      },
    },
    '../lib/coinBalance': library,
    '../lib/demoData': { DEMO_TOKEN: 'demo-token' },
    '../store/authStore': { useAuthStore },
  });
  const change = (next) => {
    auth = next;
    listeners.forEach((fn) => fn());
  };
  useCoinBalance();
  const blurA = focus();
  await flush();
  change({ ...auth, user: { uid: 'B', getIdToken: async () => 'B-token' } });
  assert.equal(useCoinBalance().balance, null);
  blurA();
  const blurB = focus();
  await flush();
  oldToken.resolve('A-token');
  await flush();
  assert.deepEqual(tokens, ['B-token']);
  assert.equal(useCoinBalance().balance, 1000);
  assert.equal(useCoinBalance().balance, 1000, 'another consumer shares the same verified balance');
  response = 750;
  activeListeners.forEach((fn) => fn('background'));
  assert.equal(tokens.length, 1);
  activeListeners.forEach((fn) => fn('active'));
  await flush();
  assert.equal(useCoinBalance().balance, 750);
  blurB();
  assert.equal(activeListeners.size, 0);
  change({ ...auth, user: null, isDemo: true });
  assert.equal(useCoinBalance().balance, null);
  const blurDemo = focus();
  await flush();
  assert.equal(tokens.at(-1), 'demo-token');
  blurDemo();
  change({ user: null, isDemo: false, isAuthenticated: false });
  assert.equal(useCoinBalance().balance, null);
  const previousCalls = tokens.length;
  const blur = focus();
  await flush();
  assert.equal(tokens.length, previousCalls);
  blur();
});

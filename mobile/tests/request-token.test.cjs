const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require(process.env.LILOVE_REQUEST_TOKEN_TYPESCRIPT || '../node_modules/typescript');
const sourceRoot = process.env.LILOVE_REQUEST_TOKEN_SOURCE || path.join(__dirname, '..');

function load(file, imports, globals = {}) {
  const source = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'console', ...Object.keys(globals), code)(
    (name) => {
      assert(name in imports, `Unexpected import ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    { log() {}, warn() {}, error() {} },
    ...Object.values(globals)
  );
  return module.exports;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const flush = () => new Promise(setImmediate);
const user = (uid, getIdToken) => ({ uid, getIdToken });

function harness() {
  const manager = load('src/services/tokenManager.ts', {
    'expo-secure-store': {
      getItemAsync: async () => null,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {},
    },
  }).tokenManager;
  const auth = { currentUser: null };
  let state, callback;
  const profiles = [],
    calls = [],
    timers = [];
  const clock = {
    setTimeout(fn, ms) {
      const timer = { fn, ms, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      timer.cleared = true;
    },
  };
  const store = load(
    'src/store/authStore.ts',
    {
      zustand: {
        create(initialize) {
          state = initialize(
            (patch) => Object.assign(state, patch),
            () => state
          );
          return { getState: () => state };
        },
      },
      '../lib/firebase': {
        auth,
        logout: async () => {
          auth.currentUser = null;
        },
        subscribeToAuthState(fn) {
          callback = fn;
          return () => {};
        },
        subscribeToUserProfile(uid, fn) {
          profiles.push({ uid, fn });
          return () => {};
        },
      },
      '../services/tokenManager': { tokenManager: manager },
      '../i18n': { t: (key) => key },
    },
    clock
  );
  const api = load(
    'src/lib/api.ts',
    {
      'expo-constants': {
        default: {
          expoConfig: { extra: { apiUrl: 'https://api.test.invalid' } },
        },
      },
      '../services/tokenManager': { tokenManager: manager },
      './demoData': {
        DEMO_TOKEN: 'demo',
        demoDisi: () => null,
        demoCevap: () => ({ demo: true }),
      },
      '../i18n': { t: (key) => key },
      './habits': { createHabitsApi: () => ({}) },
    },
    {
      ...clock,
      fetch: async (url, options) => {
        calls.push({ url, ...options });
        return { ok: true, json: async () => ({ ok: true }) };
      },
    }
  ).apiClient;
  let stop = state.initializeAuth();
  return {
    manager,
    api,
    state,
    calls,
    profiles,
    timers,
    emit(value) {
      auth.currentUser = value;
      return callback(value);
    },
    stop() {
      stop();
    },
    restart() {
      stop = state.initializeAuth();
    },
    demo: async () => {
      state.isDemo = true;
      state.isAuthenticated = false;
      await manager.setToken('demo');
    },
    timeout() {
      const timer = timers.findLast((t) => !t.cleared && t.ms === 15000);
      assert(timer);
      timer.fn();
    },
    capture: store.captureAccountSession,
  };
}

test('an expired cached credential is refreshed before the first ordinary HTTP request', async () => {
  const h = harness();
  let token = 'old';
  let reads = 0;
  await h.emit(
    user('A', async (force) => {
      assert.notEqual(force, true);
      reads++;
      return token;
    })
  );
  token = 'fresh';
  await h.api.get('/probe', { maxRetries: 0 });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].headers.Authorization, 'Bearer fresh');
  assert.equal(reads, 2);
  h.stop();
});

test('SDK failure rejects before HTTP without falling back to a cached credential', async () => {
  const h = harness();
  let reads = 0;
  await h.emit(
    user('A', async () => {
      if (++reads === 1) return 'old';
      throw new Error('refresh unavailable');
    })
  );
  await assert.rejects(h.api.post('/write', { one: 1 }), /refresh unavailable/);
  assert.equal(h.calls.length, 0);
  assert.equal(await h.manager.getToken(), 'old');
  h.stop();
});

test('A to B to A invalidates an old pending credential before HTTP', async () => {
  const h = harness(),
    gate = deferred();
  let reads = 0;
  await h.emit(user('A', async () => (++reads === 1 ? 'old-A' : gate.promise)));
  const pending = assert.rejects(h.api.get('/probe'), {
    code: 'AUTH_SESSION_CHANGED',
  });
  await flush();
  await h.emit(user('B', async () => 'B'));
  await h.emit(user('A', async () => 'current-A'));
  gate.resolve('late-A');
  await pending;
  assert.equal(h.calls.length, 0);
  assert.equal(await h.manager.getToken(), 'current-A');
  h.stop();
});

test('disposing the session rejects a pending credential without HTTP or cache mutation', async () => {
  const h = harness(),
    gate = deferred();
  let reads = 0;
  await h.emit(user('A', async () => (++reads === 1 ? 'old' : gate.promise)));
  const pending = assert.rejects(h.api.get('/probe'), {
    code: 'AUTH_SESSION_CHANGED',
  });
  await flush();
  h.stop();
  gate.resolve('late');
  await pending;
  assert.equal(h.calls.length, 0);
  assert.equal(await h.manager.getToken(), 'old');
});

test('credential refresh has a bounded deadline and late success cannot send HTTP', async () => {
  const h = harness(),
    gate = deferred();
  let reads = 0;
  await h.emit(user('A', async () => (++reads === 1 ? 'old' : gate.promise)));
  const pending = assert.rejects(h.api.post('/write', { one: 1 }), {
    code: 'AUTH_TOKEN_TIMEOUT',
    status: 408,
  });
  await flush();
  h.timeout();
  await pending;
  gate.resolve('late');
  await flush();
  assert.equal(h.calls.length, 0);
  assert.equal(await h.manager.getToken(), 'old');
  h.stop();
});

test('an explicitly pinned operation retains its credential and sends only one write', async () => {
  const h = harness();
  let reads = 0;
  await h.emit(
    user('A', async () => {
      reads++;
      return 'initial';
    })
  );
  await h.api.post('/write', { one: 1 }, { authorizationToken: 'pinned' });
  assert.equal(reads, 1);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].headers.Authorization, 'Bearer pinned');
  h.stop();
});

test('demo remains offline and never obtains a Firebase credential', async () => {
  const h = harness();
  await h.demo();
  assert.deepEqual(await h.api.get('/probe'), { demo: true });
  assert.equal(h.calls.length, 0);
  h.stop();
});

test('ordinary cached reads preserve IAP token comparison semantics', async () => {
  const h = harness();
  let reads = 0;
  await h.emit(
    user('A', async () => {
      reads++;
      return 'initial';
    })
  );
  assert.equal(await h.manager.getToken(), 'initial');
  assert.equal(await h.manager.getToken(), 'initial');
  assert.equal(reads, 1);
  h.stop();
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function load(platform, firebase, storage = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/firebaseAuth.ts'), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const imports = {
    '@react-native-async-storage/async-storage': { default: storage },
    'react-native': { Platform: { OS: platform } },
    'firebase/auth': firebase,
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => {
      assert(name in imports, `Unexpected import ${name}`);
      return imports[name];
    },
    module,
    module.exports
  );
  return module.exports.initializeAppAuth;
}

for (const platform of ['ios', 'android']) {
  test(`${platform} initializes Auth with the existing AsyncStorage adapter`, () => {
    const app = {};
    const auth = {};
    const storage = {};
    const persistence = {};
    const initialize = load(
      platform,
      {
        getReactNativePersistence(received) {
          assert.equal(received, storage);
          return persistence;
        },
        initializeAuth(received, options) {
          assert.equal(received, app);
          assert.deepEqual(options, { persistence });
          return auth;
        },
        getAuth() {
          assert.fail('A new native session must not use default memory initialization');
        },
      },
      storage
    );
    assert.equal(initialize(app), auth);
  });
}

test('web retains getAuth without requiring a React Native export', () => {
  const app = {};
  const auth = {};
  assert.equal(
    load('web', {
      getAuth(received) {
        assert.equal(received, app);
        return auth;
      },
    })(app),
    auth
  );
  const failure = new Error('Web initialization failed');
  assert.throws(
    () =>
      load('web', {
        getAuth: () => {
          throw failure;
        },
      })(app),
    (error) => error === failure
  );
});

test('native initialization errors are propagated rather than replaced by memory auth', () => {
  for (const failure of [
    Object.assign(new Error('Invalid key'), { code: 'auth/invalid-api-key' }),
    new Error('Unavailable'),
  ]) {
    assert.throws(
      () =>
        load('ios', {
          getReactNativePersistence: () => ({}),
          initializeAuth: () => {
            throw failure;
          },
          getAuth: () => assert.fail('Must not suppress an initialization error'),
        })({}),
      (error) => error === failure
    );
  }
});

test('missing or failing native persistence never falls back to getAuth', () => {
  assert.throws(
    () => load('ios', { getAuth: () => assert.fail('Missing RN implementation') })({}),
    /React Native persistence is unavailable/
  );
  const failure = new Error('Adapter failed');
  assert.throws(
    () =>
      load('ios', {
        getReactNativePersistence: () => {
          throw failure;
        },
        getAuth: () => assert.fail('Adapter failure must propagate'),
      })({}),
    (error) => error === failure
  );
});

test('installed RN SDK reads persistent storage and reuses Auth after module re-evaluation', async () => {
  // Node normally resolves Firebase's Node entry. Load the installed public RN
  // entry selected by Metro, with an in-memory AsyncStorage substitute only.
  const sdkRoot = path.dirname(require.resolve('@firebase/auth/package.json'));
  const firebase = require(path.join(sdkRoot, 'dist/rn/index.js'));
  const { initializeApp, deleteApp } = require('firebase/app');
  const values = new Map();
  const reads = [];
  const storage = {
    async getItem(key) {
      reads.push(key);
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
  const app = initializeApp({ apiKey: 'qa-key', projectId: 'qa-project' }, 'persistence-0084');
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => {
    networkCalls++;
    throw new Error('Network forbidden in persistence test');
  };
  try {
    const first = load('ios', firebase, storage)(app);
    await first.authStateReady();
    const second = load('ios', firebase, storage)(app);
    assert.equal(second, first);
    assert.equal(first.currentUser, null);
    assert(reads.includes('firebase:authUser:qa-key:persistence-0084'));
    assert.equal(networkCalls, 0);
  } finally {
    await deleteApp(app);
    globalThis.fetch = originalFetch;
  }
});

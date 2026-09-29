const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function load(relative, imports, globals = {}) {
  const source = fs.readFileSync(
    path.join(process.env.LILOVE_AUTH_TEST_SOURCE || path.join(__dirname, '..'), relative),
    'utf8'
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
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
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
const flush = () => new Promise(setImmediate);
function tokens(overrides = {}) {
  return load('src/services/tokenManager.ts', {
    'expo-secure-store': {
      getItemAsync: async () => null,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {},
      ...overrides,
    },
  }).tokenManager;
}

test('failed keychain deletion cannot resurrect an old token in this session', async () => {
  const deleted = [];
  const manager = tokens({
    getItemAsync: async () => 'stale-disk-token',
    deleteItemAsync: async (key) => {
      deleted.push(key);
      throw new Error('keychain unavailable');
    },
  });
  await manager.setToken('old-token');
  const notifications = [];
  manager.onTokenChange((token) => notifications.push(token));
  await manager.clearToken();
  assert.equal(await manager.getToken(), null);
  assert.deepEqual(notifications, [null]);
  assert.deepEqual(deleted.sort(), ['authToken', 'refreshToken']);
});

test('late disk read cannot restore a token after logout', async () => {
  const disk = deferred();
  const manager = tokens({ getItemAsync: () => disk.promise });
  const reading = manager.getToken();
  await manager.clearToken();
  disk.resolve('old-disk-token');
  assert.equal(await reading, null);
  assert.equal(manager.getCachedToken(), null);
});

test('late initialization cannot overwrite a newly selected account token', async () => {
  const disk = deferred();
  const manager = tokens({ getItemAsync: () => disk.promise });
  const initializing = manager.initialize();
  await manager.setToken('new-account-token');
  disk.resolve('old-account-token');
  await initializing;
  assert.equal(await manager.getToken(), 'new-account-token');
});

test('an in-flight keychain write completes before a subsequent logout deletion', async () => {
  const writing = deferred();
  const started = deferred();
  let stored = null;
  const manager = tokens({
    setItemAsync: async (_key, value) => {
      started.resolve();
      await writing.promise;
      stored = value;
    },
    deleteItemAsync: async () => {
      stored = null;
    },
  });
  const saving = manager.setToken('old-token');
  await started.promise;
  const clearing = manager.clearToken();
  assert.equal(await manager.getToken(), null);
  writing.resolve();
  await Promise.all([saving, clearing]);
  assert.equal(stored, null);
});

test('one failed token listener does not prevent other listeners or keychain updates', async () => {
  let stored;
  const manager = tokens({ setItemAsync: async (_key, value) => (stored = value) });
  const seen = [];
  manager.onTokenChange(() => {
    throw new Error('subscriber failed');
  });
  manager.onTokenChange((token) => seen.push(token));
  await manager.setToken('active-token');
  assert.equal(stored, 'active-token');
  assert.deepEqual(seen, ['active-token']);
});

test('a listener-triggered logout does not deliver the superseded token to later listeners', async () => {
  const manager = tokens();
  const seen = [];
  let clearing;
  manager.onTokenChange((token) => {
    if (token) clearing = manager.clearToken();
  });
  manager.onTokenChange((token) => seen.push(token));
  await manager.setToken('superseded');
  await clearing;
  assert.deepEqual(seen, [null]);
  assert.equal(await manager.getToken(), null);
});

function session() {
  let state;
  let callback;
  let stopped = false;
  let currentToken = null;
  const profiles = [];
  const manager = {
    async setToken(value) {
      currentToken = value;
    },
    async clearToken() {
      currentToken = null;
    },
  };
  load(
    'src/store/authStore.ts',
    {
      zustand: {
        create(initializer) {
          state = initializer(
            (patch) => Object.assign(state, patch),
            () => state
          );
          return { getState: () => state };
        },
      },
      '../lib/firebase': {
        subscribeToAuthState(fn) {
          callback = fn;
          return () => (stopped = true);
        },
        subscribeToUserProfile(uid, fn) {
          const entry = { uid, callback: fn, detached: false };
          profiles.push(entry);
          return () => (entry.detached = true);
        },
      },
      '../services/tokenManager': { tokenManager: manager },
      '../i18n': { t: (key) => key },
    },
    { setTimeout: () => 1, clearTimeout() {} }
  );
  const stop = state.initializeAuth();
  return {
    state,
    stop,
    emit: (user) => callback(user),
    profiles,
    get token() {
      return currentToken;
    },
    get stopped() {
      return stopped;
    },
  };
}
const user = (uid, token = uid) => ({
  uid,
  email: `${uid}@example.invalid`,
  getIdToken: async () => token,
});

test('account change detaches previous profile and rejects its late response', async () => {
  const auth = session();
  await auth.emit(user('a'));
  auth.profiles[0].callback({ id: 'a', displayName: 'Account A' });
  await auth.emit(user('b'));
  assert.equal(auth.profiles[0].detached, true);
  assert.equal(auth.state.userProfile, null);
  auth.profiles[1].callback({ id: 'b', displayName: 'Account B' });
  auth.profiles[0].callback({ id: 'a', displayName: 'Late A' });
  assert.equal(auth.state.userProfile.id, 'b');
});

test('late token response from a prior account cannot replace current identity', async () => {
  const auth = session();
  const token = deferred();
  const first = auth.emit({ ...user('a'), getIdToken: () => token.promise });
  await flush();
  await auth.emit(user('b'));
  token.resolve('late-a-token');
  await first;
  assert.equal(auth.token, 'b');
  assert.equal(auth.state.user.uid, 'b');
  assert.deepEqual(
    auth.profiles.map((profile) => profile.uid),
    ['b']
  );
});

test('cleanup prevents pending authentication from writing tokens or subscribing', async () => {
  const auth = session();
  const token = deferred();
  const pending = auth.emit({ ...user('a'), getIdToken: () => token.promise });
  await flush();
  auth.stop();
  token.resolve('late-token');
  await pending;
  assert.equal(auth.stopped, true);
  assert.equal(auth.token, null);
  assert.equal(auth.profiles.length, 0);
});

test('token acquisition failure does not open an authenticated application', async () => {
  const auth = session();
  await auth.emit({
    ...user('a'),
    getIdToken: async () => {
      throw new Error('no token');
    },
  });
  assert.equal(auth.state.isAuthenticated, false);
  assert.equal(auth.state.isLoading, false);
  assert.equal(auth.token, null);
  assert.equal(auth.profiles.length, 0);
});

test('token refresh replaces the token without clearing the same account profile', async () => {
  const auth = session();
  await auth.emit(user('a', 'first'));
  auth.profiles[0].callback({ id: 'a' });
  await auth.emit(user('a', 'refreshed'));
  assert.equal(auth.token, 'refreshed');
  assert.equal(auth.state.userProfile.id, 'a');
  assert.equal(auth.profiles[0].detached, true);
});

test('signed-out Firebase callback preserves an active sample-data tour', async () => {
  const auth = session();
  Object.assign(auth.state, { isDemo: true, isAuthenticated: true, userProfile: { id: 'demo' } });
  await auth.emit(null);
  assert.equal(auth.state.isDemo, true);
  assert.equal(auth.state.isAuthenticated, true);
  assert.equal(auth.state.userProfile.id, 'demo');
});

test('Firebase observer includes ID-token refresh events', () => {
  let observed = false;
  let initialized = 0;
  const app = {};
  const auth = {};
  const firebase = load('src/lib/firebase.ts', {
    'firebase/app': { getApps: () => [], initializeApp: () => app },
    './firebaseAuth': {
      initializeAppAuth: (received) => {
        assert.equal(received, app);
        initialized++;
        return auth;
      },
    },
    'firebase/auth': {
      onAuthStateChanged: () => () => {},
      onIdTokenChanged: (received, listener) => {
        assert.equal(received, auth);
        observed = true;
        listener(null);
        return () => {};
      },
    },
    'firebase/firestore': { getFirestore: () => ({}) },
    'expo-constants': { default: { expoConfig: { extra: { firebase: {} } } } },
    '../i18n': { t: (key) => key },
  });
  let callbackValue = 'not-called';
  firebase.subscribeToAuthState((value) => (callbackValue = value));
  assert.equal(initialized, 1);
  assert.equal(observed, true);
  assert.equal(callbackValue, null);
});

test('clearing credentials also blocks a late refresh-token read', async () => {
  const disk = deferred();
  const manager = tokens({ getItemAsync: () => disk.promise });
  const reading = manager.getRefreshToken();
  await manager.clearToken();
  disk.resolve('old-refresh-token');
  assert.equal(await reading, null);
  assert.equal(await manager.getRefreshToken(), null);
});

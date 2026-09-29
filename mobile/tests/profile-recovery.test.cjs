const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function load(relative, imports, globals = {}) {
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

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const user = (uid, token = uid) => ({
  uid,
  email: `${uid}@example.invalid`,
  getIdToken: async () => token,
});

function session() {
  let state,
    authCallback,
    timerId = 0;
  const timers = new Map();
  const profiles = [];
  const control = {
    authSubscriptions: 0,
    subscribeError: null,
    logout: async () => {},
    token: null,
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
        subscribeToAuthState(callback) {
          control.authSubscriptions++;
          authCallback = callback;
          return () => {};
        },
        subscribeToUserProfile(uid, success, error) {
          if (control.subscribeError) throw control.subscribeError;
          const entry = { uid, success, error, detached: false };
          profiles.push(entry);
          return () => {
            entry.detached = true;
          };
        },
        logout: () => control.logout(),
        signInWithEmail: async () => {},
      },
      '../services/tokenManager': {
        tokenManager: {
          async setToken(value) {
            control.token = value;
          },
          async clearToken() {
            control.token = null;
          },
        },
      },
      '../i18n': { t: (key) => key },
    },
    {
      setTimeout: (callback, milliseconds) => {
        timers.set(++timerId, { callback, milliseconds });
        return timerId;
      },
      clearTimeout: (id) => timers.delete(id),
    }
  );
  const stop = state.initializeAuth();
  return {
    state,
    control,
    profiles,
    timers,
    stop,
    emit: (value) => authCallback(value),
    expire() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach(({ callback }) => callback());
    },
  };
}

test('a profile read error ends loading without fabricating profile or denying the authenticated account', async () => {
  const h = session();
  await h.emit(user('a'));
  assert.equal(typeof h.profiles[0].error, 'function');
  h.profiles[0].error(new Error('permission-denied'));
  assert.equal(h.state.profileStatus, 'error');
  assert.equal(h.state.isLoading, false);
  assert.equal(h.state.isAuthenticated, true);
  assert.equal(h.state.userProfile, null);
  assert.equal(h.state.error, null);
  assert.equal(h.control.token, 'a');
  assert.equal(h.timers.size, 0);
});

test('synchronous subscription failure is a recoverable profile error', async () => {
  const h = session();
  h.control.subscribeError = new Error('subscription failed');
  await h.emit(user('a'));
  assert.equal(h.state.profileStatus, 'error');
  assert.equal(h.state.isLoading, false);
  assert.equal(h.timers.size, 0);
  h.control.subscribeError = null;
  h.state.retryProfile();
  assert.equal(h.profiles.length, 1);
  assert.equal(h.control.authSubscriptions, 1);
});

test('a missing document is not an invented 100-coin profile and can arrive after signup', async () => {
  const h = session();
  await h.emit(user('a'));
  h.profiles[0].success(null);
  assert.equal(h.state.userProfile, null);
  assert.equal(h.state.profileStatus, 'error');
  const actual = {
    id: 'a',
    uid: 'a',
    coinBalance: 7,
    notes: ['retained'],
    displayName: 'Actual name',
  };
  h.profiles[0].success(actual);
  assert.equal(h.state.userProfile, actual);
  assert.equal(h.state.profileStatus, 'ready');
  assert.equal(h.timers.size, 0);
});

test('first profile response times out at 15 seconds but its current late success can recover', async () => {
  const h = session();
  await h.emit(user('a'));
  assert.equal(h.state.isLoading, false);
  assert.equal(h.state.profileStatus, 'loading');
  assert.deepEqual(
    [...h.timers.values()].map((timer) => timer.milliseconds),
    [15000]
  );
  h.expire();
  assert.equal(h.state.profileStatus, 'error');
  assert.equal(h.profiles[0].detached, false);
  h.profiles[0].success({ id: 'a' });
  assert.equal(h.state.profileStatus, 'ready');
});

test('retry replaces only the current profile subscription and ignores old success, error and timeout', async () => {
  const h = session();
  await h.emit(user('a'));
  const old = h.profiles[0];
  const oldTimeout = [...h.timers.values()][0].callback;
  old.error(new Error('offline'));
  h.state.retryProfile();
  assert.equal(old.detached, true);
  assert.equal(h.control.authSubscriptions, 1);
  assert.equal(h.profiles.length, 2);
  h.profiles[1].success({ id: 'a', coinBalance: 3 });
  old.success({ id: 'stale' });
  old.error(new Error('stale'));
  oldTimeout();
  assert.equal(h.state.profileStatus, 'ready');
  assert.equal(h.state.userProfile.id, 'a');
  assert.equal(h.timers.size, 0);
});

test('account switching and token rotation invalidate previous profile attempts', async () => {
  const h = session();
  await h.emit(user('a'));
  const a = h.profiles[0];
  await h.emit(user('b'));
  const b = h.profiles[1];
  b.success({ id: 'b', saved: 'untouched' });
  await h.emit(user('b', 'rotated'));
  assert.equal(h.state.userProfile.saved, 'untouched');
  assert.equal(h.state.profileStatus, 'ready');
  assert.equal(h.state.isLoading, false);
  assert.equal(h.control.token, 'rotated');
  a.error(new Error('old account'));
  a.success({ id: 'a' });
  b.error(new Error('old attempt'));
  h.profiles[2].success({ id: 'b', saved: 'current' });
  assert.equal(h.state.profileStatus, 'ready');
  assert.equal(h.state.userProfile.saved, 'current');
  assert.equal(h.control.authSubscriptions, 1);
});

test('cleanup invalidates profile callbacks, timers and retry', async () => {
  const h = session();
  await h.emit(user('a'));
  const before = { ...h.state };
  const timer = [...h.timers.values()][0].callback;
  h.stop();
  h.profiles[0].success({ id: 'late' });
  h.profiles[0].error(new Error('late'));
  timer();
  h.state.retryProfile();
  assert.deepEqual(h.state, before);
  assert.equal(h.profiles[0].detached, true);
  assert.equal(h.profiles.length, 1);
  assert.equal(h.timers.size, 0);
});

test('logout immediately invalidates pending profile work and ignores stale auth while sign-out waits', async () => {
  const h = session();
  await h.emit(user('a'));
  const pending = deferred();
  h.control.logout = () => pending.promise;
  const closing = h.state.logout();
  h.profiles[0].success({ id: 'late' });
  h.profiles[0].error(new Error('late'));
  await h.emit(user('a', 'late-token'));
  h.state.retryProfile();
  assert.equal(h.control.token, null);
  assert.equal(h.state.userProfile, null);
  assert.equal(h.state.isAuthenticated, false);
  assert.equal(h.profiles.length, 1);
  assert.equal(h.timers.size, 0);
  pending.resolve();
  await closing;
  assert.equal(h.state.profileStatus, 'idle');
  assert.equal(h.state.isLoading, false);
});

test('demo is preserved by a signed-out callback and profile retry does not start a server profile read', async () => {
  const h = session();
  const demo = { id: 'demo', coinBalance: 100 };
  Object.assign(h.state, {
    isDemo: true,
    isAuthenticated: true,
    isLoading: false,
    userProfile: demo,
  });
  await h.emit(null);
  h.state.retryProfile();
  assert.equal(h.state.userProfile, demo);
  assert.equal(h.profiles.length, 0);
});

test('a cleared first-response timeout cannot downgrade an already received profile', async () => {
  const h = session();
  await h.emit(user('a'));
  const queuedTimeout = [...h.timers.values()][0].callback;
  h.profiles[0].success({ id: 'a', customFields: ['retained'] });
  queuedTimeout();
  assert.equal(h.state.profileStatus, 'ready');
  assert.deepEqual(h.state.userProfile.customFields, ['retained']);
});

test('failed sign-out cannot reopen the local session through old profile or auth callbacks', async () => {
  const h = session();
  await h.emit(user('a'));
  h.control.logout = async () => {
    throw new Error('Sign-out failed');
  };
  await h.state.logout();
  await h.emit(user('a', 'stale-after-logout'));
  h.profiles[0].success({ id: 'a' });
  h.state.retryProfile();
  assert.equal(h.state.isAuthenticated, false);
  assert.equal(h.state.userProfile, null);
  assert.equal(h.control.token, null);
  assert.equal(h.state.isLoading, false);
  assert(h.state.error);
  await h.state.login('a@example.invalid', 'test-only');
  await h.emit(user('a', 'explicit-sign-in'));
  h.profiles[1].success({ id: 'a' });
  assert.equal(h.state.profileStatus, 'ready');
  assert.equal(h.control.token, 'explicit-sign-in');
});

test('token refresh failure detaches a profile retry started while the token was pending', async () => {
  const h = session();
  await h.emit(user('a'));
  h.profiles[0].error(new Error('Read failed'));
  const pending = deferred();
  const refreshing = h.emit({ ...user('a'), getIdToken: () => pending.promise });
  h.state.retryProfile();
  assert.equal(h.profiles.length, 2);
  pending.reject(new Error('Token unavailable'));
  await refreshing;
  assert.equal(h.profiles[1].detached, true);
  assert.equal(h.timers.size, 0);
  h.profiles[1].success({ id: 'late' });
  assert.equal(h.state.userProfile, null);
  assert.equal(h.state.isAuthenticated, false);
});

test('Firebase profile adapter forwards terminal snapshot errors and preserves document fields', () => {
  let success, failure;
  const firebase = load('src/lib/firebase.ts', {
    'firebase/app': { getApps: () => [], initializeApp: () => ({}) },
    './firebaseAuth': { initializeAppAuth: () => ({}) },
    'firebase/auth': {},
    'firebase/firestore': {
      getFirestore: () => ({}),
      doc: (_db, collection, uid) => ({ collection, uid }),
      onSnapshot(ref, next, onError) {
        assert.deepEqual(ref, { collection: 'users', uid: 'a' });
        success = next;
        failure = onError;
        return () => {};
      },
    },
    'expo-constants': { default: { expoConfig: { extra: { firebase: {} } } } },
    '../i18n': { t: (key) => key },
  });
  const received = [],
    errors = [];
  firebase.subscribeToUserProfile(
    'a',
    (value) => received.push(value),
    (error) => errors.push(error)
  );
  const denied = new Error('permission-denied');
  failure(denied);
  success({
    id: 'a',
    exists: () => true,
    data: () => ({ coinBalance: 7, custom: { name: 'kept' } }),
  });
  success({ exists: () => false });
  assert.deepEqual(errors, [denied]);
  assert.deepEqual(received, [{ id: 'a', coinBalance: 7, custom: { name: 'kept' } }, null]);
});

const jsx = (type, props) => ({ type, props });
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}

test('actual recovery controls invoke retry/logout and keep logout available while pending', () => {
  const { ProfileRecovery } = load('src/components/ProfileRecovery.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': new Proxy(
      { StyleSheet: { create: (styles) => styles } },
      { get: (obj, key) => obj[key] || key }
    ),
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../i18n': { t: (key) => key },
    '../theme/ThemeProvider': {
      useThemedStyles: (styles) => styles,
      useTheme: () => ({ color: (value) => value }),
    },
  });
  let retries = 0,
    logouts = 0;
  for (const pending of [false, true]) {
    const tree = ProfileRecovery({ pending, onRetry: () => retries++, onLogout: () => logouts++ });
    const buttons = nodes(tree).filter((node) => node.type === 'TouchableOpacity');
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].props.disabled, pending);
    assert.equal(buttons[1].props.disabled, undefined);
    if (!pending) buttons[0].props.onPress();
    buttons[1].props.onPress();
    const title = pending ? 'profile_loading' : 'profile_unavailable_title';
    assert(nodes(tree).some((node) => node.props?.children === title));
  }
  assert.equal(retries, 1);
  assert.equal(logouts, 2);
});

test('actual AppContent gates missing profiles, preserves ready MainStack and keeps demo independent', () => {
  const source = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');
  const ast = ts.createSourceFile(
    'App.tsx',
    source,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TSX
  );
  const declaration = ast.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'AppContent'
  );
  assert(declaration);
  const code = ts.transpileModule(`export ${declaration.getText(ast)}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const state = {
    isAuthenticated: true,
    isDemo: false,
    isLoading: false,
    profileStatus: 'error',
    retryProfile() {},
    logout() {},
  };
  const globals = {
    useTheme: () => ({ ready: true, color: (value) => value }),
    useThemedStyles: () => ({}),
    DarkTheme: { colors: {} },
    DefaultTheme: { colors: {} },
    baseStyles: {},
    useAuthStore: () => state,
    useEffect() {},
    t: (key) => key,
    ...Object.fromEntries(
      [
        'SafeAreaProvider',
        'ProfileRecovery',
        'StatusBar',
        'ErrorBoundary',
        'NavigationContainer',
        'MainStack',
        'AuthStack',
        'View',
        'Text',
        'ActivityIndicator',
      ].map((key) => [key, key])
    ),
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
    () => ({ jsx, jsxs: jsx }),
    module,
    module.exports,
    ...Object.values(globals)
  );
  for (const phase of ['loading', 'error']) {
    state.profileStatus = phase;
    const tree = module.exports.AppContent();
    const recovery = nodes(tree).find((node) => node.type === 'ProfileRecovery');
    assert(recovery);
    assert.equal(recovery.props.pending, phase === 'loading');
    assert.equal(recovery.props.onRetry, state.retryProfile);
    assert.equal(recovery.props.onLogout, state.logout);
    assert(!nodes(tree).some((node) => node.type === 'MainStack'));
  }
  state.profileStatus = 'ready';
  assert(nodes(module.exports.AppContent()).some((node) => node.type === 'MainStack'));
  state.profileStatus = 'error';
  state.isDemo = true;
  assert(nodes(module.exports.AppContent()).some((node) => node.type === 'MainStack'));
});

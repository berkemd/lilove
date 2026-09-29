const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function load(relative, imports = {}, globals = {}) {
  const filename = path.join(__dirname, '..', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
    (name) => {
      assert(name in imports, `Unexpected dependency ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    ...Object.values(globals)
  );
  return module.exports;
}
const { AccountDeletion } = load('src/lib/accountDeletion.ts');
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const flush = () => new Promise(setImmediate);
const job = (status = 'pending', extra = {}) => ({
  id: 'job-a',
  status,
  phase: 'guard',
  canCancel: status === 'pending',
  retryable: false,
  ...extra,
});
const record = (uid = 'a') => ({
  uid,
  idempotencyKey: 'request-a',
  statusReceipt: 'a'.repeat(64),
  deletion: job(),
});
async function harness(overrides = {}) {
  const state = { uid: 'a', epoch: 1, disk: null, posts: [], finishes: [], calls: [] };
  const deps = {
    read: async () => state.disk,
    write: async (value) => {
      state.calls.push('save');
      state.disk = value;
    },
    session: () => {
      if (!state.uid) throw { code: 'authentication_required' };
      const uid = state.uid,
        epoch = state.epoch;
      return {
        uid,
        isCurrent: () => state.uid === uid && state.epoch === epoch,
        finish: async () => state.finishes.push(uid),
      };
    },
    uuid: () => 'request-a',
    receipt: () => 'a'.repeat(64),
    capability: async () => ({ available: true }),
    request: async (saved, authorization) => {
      state.calls.push('post');
      state.posts.push({ saved, authorization });
      assert.equal(JSON.parse(state.disk)[saved.uid].statusReceipt, saved.statusReceipt);
      return { deletion: job(), receiptExpiresAt: '2099-01-01T00:00:00Z' };
    },
    status: async () => ({ deletion: job() }),
    cancel: async () => ({ deletion: job('cancelled') }),
    ...overrides,
  };
  const controller = new AccountDeletion(deps);
  await controller.initialize(state.uid);
  return {
    controller,
    deps,
    state,
    authenticate: async () => ({ token: 'fresh-a' }),
    switchAccount: (uid) => {
      state.uid = uid;
      state.epoch++;
      controller.setAccount(uid);
    },
  };
}

test('disabled capability prevents reauthentication, storage and deletion', async () => {
  const h = await harness({ capability: async () => ({ available: false }) });
  await h.controller.request(() => assert.fail('No reauthentication'));
  assert.equal(h.controller.getSnapshot().error, 'deletion_unavailable');
  assert.deepEqual(h.state.calls, []);
});

test('accepted request saves receipt before POST and never reports completed or logs out', async () => {
  const h = await harness();
  await h.controller.request(h.authenticate);
  assert.deepEqual(h.state.calls, ['save', 'post', 'save']);
  assert.equal(h.controller.getSnapshot().record.deletion.status, 'pending');
  assert.deepEqual(h.state.finishes, []);
  assert.equal(h.state.posts[0].authorization.token, 'fresh-a');
});

test('failed secure persistence prevents a destructive request', async () => {
  const h = await harness({
    write: async () => {
      throw Error('keychain unavailable');
    },
  });
  await h.controller.request(h.authenticate);
  assert.equal(h.state.posts.length, 0);
  assert.equal(h.controller.getSnapshot().error, 'deletion_storage_failed');
});

test('cancelled or wrong-account reauthentication never submits', async () => {
  const h = await harness();
  await h.controller.request(async () => {
    throw { code: 'ERR_REQUEST_CANCELED' };
  });
  assert.equal(h.controller.getSnapshot().error, null);
  await h.controller.request(async () => {
    throw { code: 'auth/user-mismatch' };
  });
  assert.equal(h.state.posts.length, 0);
  assert.equal(h.state.disk, null);
});

test('account switch and A→B→A during reauth invalidate deletion even with the same final UID', async () => {
  const h = await harness();
  const wait = deferred();
  const pending = h.controller.request(() => wait.promise);
  await flush();
  h.switchAccount('b');
  h.switchAccount('a');
  wait.resolve({ token: 'old-a' });
  await pending;
  assert.equal(h.state.posts.length, 0);
});

test('switching while the receipt is being saved prevents POST', async () => {
  const wait = deferred();
  const h = await harness({ write: () => wait.promise });
  const pending = h.controller.request(h.authenticate);
  await flush();
  h.switchAccount('b');
  wait.resolve();
  await pending;
  assert.equal(h.state.posts.length, 0);
  assert.equal(h.controller.getSnapshot().record, null);
});

test('double tap sends one request and same-account token refresh keeps the pinned authorization', async () => {
  const wait = deferred();
  const h = await harness();
  const pending = h.controller.request(() => wait.promise);
  await flush();
  await h.controller.request(() => assert.fail('Duplicate reauth'));
  h.controller.setAccount('a');
  wait.resolve({ token: 'fresh-a' });
  await pending;
  assert.equal(h.state.posts.length, 1);
  assert.equal(h.state.posts[0].authorization.token, 'fresh-a');
});

test('lost first response resumes by persisted receipt without Firebase credentials', async () => {
  const h = await harness({
    request: async () => {
      throw { code: 'TIMEOUT', outcomeUnknown: true };
    },
  });
  await h.controller.request(h.authenticate);
  assert.equal(h.controller.getSnapshot().error, 'deletion_unknown');
  let receipt;
  const resumed = await harness({
    read: async () => h.state.disk,
    session: () => {
      throw { code: 'authentication_required' };
    },
    status: async (saved) => {
      receipt = saved.statusReceipt;
      return { deletion: job('completed') };
    },
  });
  resumed.controller.setAccount(null);
  await resumed.controller.refresh();
  assert.equal(receipt, 'a'.repeat(64));
  assert.equal(resumed.controller.getSnapshot().record.deletion.status, 'completed');
});

test('retry keeps both request key and status receipt', async () => {
  const h = await harness();
  await h.controller.request(h.authenticate);
  await h.controller.request(h.authenticate);
  assert.equal(h.state.posts[0].saved.idempotencyKey, h.state.posts[1].saved.idempotencyKey);
  assert.equal(h.state.posts[0].saved.statusReceipt, h.state.posts[1].saved.statusReceipt);
});

test('retry after an uncertain first response reads the receipt before reauth or another POST', async () => {
  const saved = { ...record(), deletion: null };
  const h = await harness({ read: async () => JSON.stringify({ a: saved }) });
  await h.controller.request(() => assert.fail('Existing accepted job needs no new reauth'));
  assert.equal(h.controller.getSnapshot().record.deletion.status, 'pending');
  assert.equal(h.state.posts.length, 0);
});

test('unavailable receipt is not treated as deletion; fresh same-key retry can recover a never-accepted request', async () => {
  const saved = { ...record(), deletion: null, receiptExpiresAt: '2099-01-01T00:00:00Z' };
  const h = await harness({
    read: async () => JSON.stringify({ a: saved }),
    status: async () => {
      throw { code: 'deletion_receipt_unavailable' };
    },
  });
  await h.controller.request(h.authenticate);
  assert.equal(h.state.posts.length, 1);
  assert.equal(h.state.posts[0].saved.idempotencyKey, saved.idempotencyKey);
  assert.equal(h.state.posts[0].saved.statusReceipt, saved.statusReceipt);
  assert.deepEqual(h.state.finishes, []);
});

test('late completed response never signs out or displays another account', async () => {
  const wait = deferred();
  const h = await harness({ request: () => wait.promise });
  const pending = h.controller.request(h.authenticate);
  await flush();
  h.switchAccount('b');
  wait.resolve({ deletion: job('completed') });
  await pending;
  assert.deepEqual(h.state.finishes, []);
  assert.equal(h.controller.getSnapshot().record, null);
  assert.equal(h.controller.getSnapshot().open, false);
});

test('only completed status finishes the current account; terminal dismissal survives restart', async () => {
  const h = await harness({ status: async () => ({ deletion: job('completed') }) });
  await h.controller.request(h.authenticate);
  await h.controller.refresh();
  assert.deepEqual(h.state.finishes, ['a']);
  await h.controller.close();
  const resumed = await harness({ read: async () => h.state.disk });
  assert.equal(resumed.controller.getSnapshot().record, null);
  assert.equal(resumed.controller.getSnapshot().open, false);
});

test('cancel requires current account reauthentication and never runs after canCancel becomes false', async () => {
  let cancellations = 0;
  const h = await harness({
    cancel: async () => {
      cancellations++;
      return { deletion: job('cancelled') };
    },
  });
  await h.controller.request(h.authenticate);
  await h.controller.cancel(h.authenticate);
  assert.equal(h.controller.getSnapshot().record.deletion.status, 'cancelled');
  await h.controller.cancel(() => assert.fail('Cannot cancel twice'));
  assert.equal(cancellations, 1);
});

function nativeHarness(provider = 'apple.com', overrides = {}) {
  const calls = [];
  let transport;
  const user = {
    uid: 'a',
    email: 'a@example.invalid',
    providerData: [{ providerId: provider }],
    getIdToken: async (force) => {
      calls.push(['token', force]);
      return 'firebase-fresh';
    },
  };
  const imports = {
    'expo-secure-store': {},
    'expo-crypto': {},
    'react-native': { Platform: { OS: 'ios' } },
    'firebase/auth': {
      OAuthProvider: class {
        credential(value) {
          return { kind: 'apple', ...value };
        }
      },
      GoogleAuthProvider: { credential: (idToken) => ({ kind: 'google', idToken }) },
      EmailAuthProvider: {
        credential: (email, password) => ({ kind: 'password', email, password }),
      },
      reauthenticateWithCredential: async (current, credential) => {
        calls.push(['reauth', current, credential]);
        return { user };
      },
      ...overrides.firebase,
    },
    '../lib/api': {
      api: {
        get: async (...args) => {
          calls.push(['get', ...args]);
          return { deletion: job() };
        },
        post: async (...args) => {
          calls.push(['post', ...args]);
          return { deletion: job() };
        },
      },
    },
    '../lib/accountDeletion': {
      AccountDeletion: class {
        constructor(deps) {
          transport = deps;
        }
      },
    },
    '../store/authStore': {},
    './appleAuth': {
      appleAuth: {
        signIn: async () => ({
          identityToken: 'apple-id',
          nonce: 'raw-nonce',
          authorizationCode: 'apple-code',
        }),
        ...overrides.apple,
      },
    },
    './googleAuth': { getIdTokenFromResponse: (value) => value.idToken },
  };
  const service = load('src/services/accountDeletion.ts', imports);
  return {
    service,
    transport,
    calls,
    user,
    session: { uid: 'a', user, isCurrent: () => true },
    options: { password: 'ephemeral-password', google: async () => ({ idToken: 'google-id' }) },
  };
}

test('Apple reauth uses ID token/raw nonce and returns the distinct authorization code for the backend', async () => {
  const h = nativeHarness();
  const result = await h.service.reauthenticateDeletion(h.session, h.options);
  assert.deepEqual(h.calls[0][2], { kind: 'apple', idToken: 'apple-id', rawNonce: 'raw-nonce' });
  assert.deepEqual(result, { token: 'firebase-fresh', appleAuthorizationCode: 'apple-code' });
  assert.deepEqual(h.calls[1], ['token', true]);
});

test('deletion requires Apple authorization code without falling back to identity or access tokens', async () => {
  const h = nativeHarness('apple.com', {
    apple: { signIn: async () => ({ identityToken: 'id', nonce: 'nonce' }) },
  });
  await assert.rejects(h.service.reauthenticateDeletion(h.session, h.options), {
    code: 'apple_reauthentication_required',
  });
  assert.deepEqual(h.calls, []);
});

test('Google/password reauth never signs in, creates profiles or reuses the cached Firebase bearer', async () => {
  for (const provider of ['google.com', 'password']) {
    const h = nativeHarness(provider);
    const result = await h.service.reauthenticateDeletion(h.session, h.options);
    assert.equal(h.calls[0][0], 'reauth');
    assert.equal(result.token, 'firebase-fresh');
    assert.equal(result.appleAuthorizationCode, undefined);
  }
});

test('Google cancellation is quiet but a provider error remains actionable', async () => {
  const h = nativeHarness('google.com');
  for (const [type, code] of [
    ['cancel', 'ERR_REQUEST_CANCELED'],
    ['error', 'deletion_reauth_failed'],
  ]) {
    await assert.rejects(
      h.service.reauthenticateDeletion(h.session, {
        password: '',
        google: async () => ({ type }),
      }),
      { code }
    );
  }
});

test('provider mismatch and account switch during native authorization abort before Firebase refresh', async () => {
  const h = nativeHarness('google.com', {
    firebase: { reauthenticateWithCredential: async () => ({ user: { uid: 'b' } }) },
  });
  await assert.rejects(h.service.reauthenticateDeletion(h.session, h.options), {
    code: 'account_changed',
  });
  assert.deepEqual(h.calls, []);
  const apple = nativeHarness();
  let current = true;
  apple.session.isCurrent = () => current;
  const wait = deferred();
  const changed = nativeHarness('apple.com', { apple: { signIn: () => wait.promise } });
  changed.session.isCurrent = () => current;
  const pending = changed.service.reauthenticateDeletion(changed.session, changed.options);
  current = false;
  wait.resolve({ identityToken: 'id', nonce: 'nonce', authorizationCode: 'code' });
  await assert.rejects(pending, { code: 'account_changed' });
  assert.deepEqual(changed.calls, []);
});

test('native transport pins request token and reads receipt status without an account bearer or query credential', async () => {
  const h = nativeHarness();
  await h.transport.request(record(), { token: 'fresh-a', appleAuthorizationCode: 'apple-code' });
  assert.deepEqual(h.calls[0], [
    'post',
    '/api/account/deletion-v2/request',
    {
      idempotencyKey: 'request-a',
      confirmation: 'DELETE',
      statusReceipt: 'a'.repeat(64),
      appleAuthorizationCode: 'apple-code',
    },
    { authorizationToken: 'fresh-a' },
  ]);
  await h.transport.status(record());
  assert.deepEqual(h.calls[1], [
    'get',
    '/api/account/deletion-v2/status',
    {
      authorizationToken: '',
      maxRetries: 0,
      headers: { 'X-Deletion-Receipt': 'a'.repeat(64) },
    },
  ]);
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  return Object.values(node)
    .map((value) => find(value, predicate))
    .find(Boolean);
}
function renderDeletion(patch = {}, signedIn = true, isDemo = false) {
  const calls = [];
  const effects = [];
  const snapshot = {
    open: true,
    busy: false,
    available: true,
    record: null,
    error: null,
    ...patch,
  };
  const user = signedIn ? { uid: 'a', providerData: [{ providerId: 'password' }] } : null;
  const actions = Object.fromEntries(
    ['open', 'close', 'request', 'cancel', 'refresh', 'initialize', 'suspendView'].map((name) => [
      name,
      async (...args) => {
        calls.push([name, ...args]);
      },
    ])
  );
  const runtime = {
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  };
  const { AccountDeletionDialog } = load('src/components/AccountDeletionDialog.tsx', {
    react: {
      useEffect(callback) {
        effects.push(callback);
      },
      useState: () => ['ephemeral-password', () => {}],
      useSyncExternalStore: () => snapshot,
    },
    'react/jsx-runtime': runtime,
    'react-native': {
      ...Object.fromEntries(
        [
          'Modal',
          'SafeAreaView',
          'ScrollView',
          'Text',
          'TextInput',
          'TouchableOpacity',
          'View',
        ].map((name) => [name, name])
      ),
      StyleSheet: { create: (value) => value },
      Alert: { alert: (...args) => calls.push(['alert', ...args]) },
      Linking: { openURL: async (url) => calls.push(['link', url]) },
    },
    '../store/authStore': { useAuthStore: () => ({ user, isLoading: false, isDemo }) },
    '../services/accountDeletion': {
      accountDeletion: actions,
      deletionProvider: () => 'password',
      reauthenticateDeletion() {},
    },
    '../services/googleAuth': { useGoogleAuth: () => ({ promptAsync: async () => ({}) }) },
    '../i18n': { t: (key) => key },
    '../theme/ThemeProvider': { useThemedStyles: (styles) => styles },
    '../lib/deletionPolling': {
      watchDeletionProgress() {
        calls.push(['poll']);
      },
    },
  });
  const tree = AccountDeletionDialog();
  return {
    tree,
    calls,
    runEffects: () => effects.forEach((effect) => effect()),
    button: (label) =>
      find(
        tree,
        (node) =>
          node.type === 'TouchableOpacity' &&
          find(node, (child) => child.type === 'Text' && child.props.children === label)
      ),
  };
}

test('deletion dialog requires confirmation, warns about subscriptions and opens Apple management', async () => {
  const h = renderDeletion();
  assert(find(h.tree, (node) => node.props?.children === 'deletion_subscription_notice'));
  h.button('deletion_manage_subscriptions').props.onPress();
  assert.deepEqual(h.calls[0], ['link', 'https://apps.apple.com/account/subscriptions']);
  h.button('deletion_confirm').props.onPress();
  assert.equal(h.calls[1][0], 'alert');
  assert(!h.calls.some(([name]) => name === 'request'));
  h.calls[1][3][1].onPress();
  await flush();
  assert(h.calls.some(([name]) => name === 'request'));
});

test('pending/retrying/receipt-only dialog never renders completed or requests another deletion', () => {
  for (const status of ['pending', 'retrying', 'processing']) {
    const h = renderDeletion(
      { record: { ...record(), deletion: job(status, { retryable: true, canCancel: false }) } },
      false
    );
    assert(h.button('deletion_check_status'));
    assert(!h.button('deletion_retry_request'));
    assert(!h.button('deletion_cancel_request'));
    assert(!find(h.tree, (node) => node.props?.children === 'deletion_completed'));
    assert(!JSON.stringify(h.tree).includes('a'.repeat(64)));
  }
});

test('capability and busy states disable destructive action; only completed response renders success', () => {
  assert.equal(
    renderDeletion({ available: false }).button('deletion_confirm').props.disabled,
    true
  );
  assert.equal(renderDeletion({ busy: true }).button('deletion_confirm').props.disabled, true);
  const done = renderDeletion({ record: { ...record(), deletion: job('completed') } });
  assert(find(done.tree, (node) => node.props?.children === 'deletion_completed'));
  assert(!done.button('deletion_confirm'));
  assert(!done.button('deletion_retry_request'));
});

test('demo mode hides saved deletion status and starts no network polling', () => {
  const h = renderDeletion({ record: record() }, false, true);
  assert.equal(h.tree, null);
  h.runEffects();
  assert.deepEqual(h.calls, [['suspendView']]);
});

test('late terminal dismissal cannot close or erase the next account view', async () => {
  const wait = deferred();
  const saved = { a: { ...record(), deletion: job('completed') }, b: record('b') };
  const h = await harness({ read: async () => JSON.stringify(saved), write: () => wait.promise });
  const closing = h.controller.close();
  await flush();
  h.switchAccount('b');
  wait.resolve();
  await closing;
  assert.equal(h.controller.getSnapshot().record.uid, 'b');
  assert.equal(h.controller.getSnapshot().open, true);
});

test('explicit dismissal removes expired status access from secure persistence', async () => {
  const h = await harness({
    read: async () =>
      JSON.stringify({ a: { ...record(), receiptExpiresAt: '2020-01-01T00:00:00Z' } }),
  });
  await h.controller.close();
  assert.deepEqual(JSON.parse(h.state.disk), {});
});

test('status polling is bounded, foreground-only and stops for busy, terminal or unmounted views', async () => {
  let nextTimer = 0;
  const timers = new Map();
  const { watchDeletionProgress } = load(
    'src/lib/deletionPolling.ts',
    {},
    {
      setTimeout: (callback, delay) => {
        assert.equal(delay, 5000);
        const id = ++nextTimer;
        timers.set(id, callback);
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    }
  );
  let snapshot = { open: true, busy: false, record: record() };
  let update,
    activityChanged,
    count = 0,
    removed = false,
    unsubscribed = false;
  const wait = deferred();
  const store = {
    getSnapshot: () => snapshot,
    subscribe: (callback) => {
      update = callback;
      return () => {
        unsubscribed = true;
      };
    },
    refresh: async () => {
      count++;
      await wait.promise;
    },
  };
  const activity = {
    currentState: 'active',
    addEventListener: (_event, callback) => {
      activityChanged = callback;
      return {
        remove: () => {
          removed = true;
        },
      };
    },
  };
  const stop = watchDeletionProgress(store, activity, 2);
  assert.equal(timers.size, 1);
  activityChanged('background');
  assert.equal(timers.size, 0);
  activityChanged('active');
  assert.equal(timers.size, 1);
  const tick = () => {
    const [id, callback] = [...timers][0];
    timers.delete(id);
    callback();
  };
  tick();
  await flush();
  assert.equal(count, 1);
  assert.equal(timers.size, 0);
  update();
  assert.equal(timers.size, 0);
  wait.resolve();
  await flush();
  assert.equal(timers.size, 1);
  snapshot = { ...snapshot, busy: true };
  update();
  tick();
  await flush();
  assert.equal(count, 1);
  assert.equal(timers.size, 0);
  snapshot = { ...snapshot, busy: false };
  update();
  tick();
  await flush();
  assert.equal(count, 2);
  assert.equal(timers.size, 0);
  stop();
  assert(removed && unsubscribed);
  const stopAgain = watchDeletionProgress(store, activity);
  snapshot = { ...snapshot, record: { ...record(), deletion: job('awaiting_apple') } };
  update();
  assert.equal(timers.size, 0);
  snapshot = { ...snapshot, record: { ...record(), deletion: job('completed') } };
  update();
  assert.equal(timers.size, 0);
  stopAgain();
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function load(relative, imports, globals = {}) {
  const filename = path.join(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), source)(
    (name) => {
      assert(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    ...Object.values(globals)
  );
  return module.exports;
}

class NativeFormData {
  parts = [];
  append(...part) {
    this.parts.push(part);
  }
}
const filePath = '/uploads/profile-pictures/profile-owned.webp';
const photoURL = `https://api.test.invalid${filePath}`;
const asset = { uri: 'file:///camera/Edited.JPG?cache=1', mimeType: 'image/jpeg' };
const response = (body = { picture: { filePath } }) => ({
  ok: true,
  status: 200,
  json: async () => body,
});
function apiHarness(fetchResult = () => response()) {
  const calls = [];
  let tokenReads = 0;
  return {
    ...load(
      'src/lib/api.ts',
      {
        'expo-constants': {
          default: { expoConfig: { extra: { apiUrl: 'https://api.test.invalid' } } },
        },
        '../services/tokenManager': {
          tokenManager: { getToken: async () => (tokenReads++, 'wrong-account-B') },
        },
        './demoData': { DEMO_TOKEN: 'demo', demoDisi: () => null, demoCevap: () => null },
        '../i18n': { t: (key) => key },
        './habits': { createHabitsApi: () => ({}) },
      },
      {
        FormData: NativeFormData,
        URL: class UnsupportedNativeURL {
          constructor() {
            throw new Error('Do not rely on Node WHATWG URL behavior');
          }
        },
        console: { log() {} },
        fetch: async (url, options) => {
          calls.push({ url, ...options });
          return fetchResult();
        },
      }
    ),
    calls,
    tokenReads: () => tokenReads,
  };
}

test('upload sends native multipart picture to the real route with a pinned token', async () => {
  const h = apiHarness();
  assert.deepEqual(await h.api.uploadProfilePicture(asset, 'account-A'), {
    profileImageUrl: photoURL,
  });
  assert.equal(h.calls.length, 1);
  const call = h.calls[0];
  assert.equal(call.url, 'https://api.test.invalid/api/profile/picture');
  assert.equal(call.method, 'POST');
  assert.deepEqual(call.headers, { Authorization: 'Bearer account-A' });
  assert(call.body instanceof NativeFormData);
  assert.deepEqual(call.body.parts, [
    ['picture', { uri: asset.uri, name: 'profile.jpg', type: 'image/jpeg' }],
  ]);
  assert.equal(h.tokenReads(), 0);
});

test('multipart leaves boundary to fetch; ordinary JSON keeps its content type and body', async () => {
  const h = apiHarness();
  const body = new NativeFormData();
  await h.apiClient.post('/upload', body, {
    headers: { 'content-type': 'incorrect', Accept: '*/*' },
  });
  assert.equal(h.calls[0].body, body);
  assert.deepEqual(h.calls[0].headers, { Accept: '*/*', Authorization: 'Bearer wrong-account-B' });
  await h.apiClient.post('/json', { title: 'one' });
  assert.equal(h.calls[1].headers['Content-Type'], 'application/json');
  assert.equal(h.calls[1].body, '{"title":"one"}');
});

for (const [selected, type, name] of [
  [{ uri: 'file:///PHOTO.JPG?temporary=1' }, 'image/jpeg', 'profile.jpg'],
  [{ uri: 'content://photo/42', fileName: 'IMG.PNG' }, 'image/png', 'profile.png'],
  [
    { uri: 'file:///edited.jpg', fileName: 'original.HEIC', mimeType: 'image/jpeg' },
    'image/jpeg',
    'profile.jpg',
  ],
  [{ uri: 'file:///photo.webp', mimeType: 'image/webp' }, 'image/webp', 'profile.webp'],
]) {
  test(`picker metadata yields ${type}: ${selected.uri}`, async () => {
    const h = apiHarness();
    await h.api.uploadProfilePicture(selected, 'account-A');
    assert.deepEqual(h.calls[0].body.parts[0][1], { uri: selected.uri, type, name });
  });
}

for (const selected of [
  { uri: 'file:///photo.heic' },
  { uri: 'file:///photo.HEIC', fileName: 'original.jpg' },
  { uri: 'file:///photo.jpg', mimeType: 'image/heic' },
  { uri: 'content://photo/42' },
]) {
  test(`unsupported media is rejected before a write: ${JSON.stringify(selected)}`, async () => {
    const h = apiHarness();
    await assert.rejects(h.api.uploadProfilePicture(selected, 'account-A'), {
      code: 'UNSUPPORTED_PHOTO_FORMAT',
    });
    assert.equal(h.calls.length, 0);
  });
}

for (const invalid of [
  'https://evil.invalid/uploads/profile-pictures/a.webp',
  '//evil.invalid/a.webp',
  '/uploads/profile-pictures/../secret.webp',
  '/uploads/profile-pictures/%2e%2e%2fsecret.webp',
  '/uploads/profile-pictures/a.webp?redirect=other',
  '/uploads/other/a.webp',
  undefined,
]) {
  test(`untrusted upload response is uncertain and never mirrored: ${invalid}`, async () => {
    const h = apiHarness(() => response({ picture: { filePath: invalid } }));
    await assert.rejects(
      h.api.uploadProfilePicture(asset, 'account-A'),
      (error) => error.outcomeUnknown === true
    );
    assert.equal(h.calls.length, 1);
  });
}

test('failed upload never replays a potentially committed photo', async () => {
  const h = apiHarness(() => {
    throw new TypeError('Network request failed');
  });
  await assert.rejects(
    h.api.uploadProfilePicture(asset, 'account-A'),
    (error) => error.outcomeUnknown === true
  );
  assert.equal(h.calls.length, 1);
});

test('render resolves legacy paths and preserves provider URLs even without native WHATWG URL support', () => {
  const h = apiHarness();
  assert.equal(h.resolveProfilePhotoUrl(filePath), photoURL);
  assert.equal(
    h.resolveProfilePhotoUrl('https://provider.test.invalid/avatar.jpg'),
    'https://provider.test.invalid/avatar.jpg'
  );
  assert.equal(h.resolveProfilePhotoUrl('/uploads/profile-pictures/../secret.webp'), undefined);
  assert.equal(h.resolveProfilePhotoUrl('file:///local/photo.jpg'), undefined);
  assert.equal(
    h.resolveProfilePhotoUrl('https://secret@provider.test.invalid/avatar.jpg'),
    undefined
  );
  assert.equal(
    h.resolveProfilePhotoUrl('https://provider.test.invalid\\evil/avatar.jpg'),
    undefined
  );
  assert.equal(h.resolveProfilePhotoUrl('https://provider.test.invalid/\nimage.jpg'), undefined);
  assert.equal(
    h.resolveProfilePhotoUrl('https://provider.test.invalid/avatar.jpg?size=128'),
    'https://provider.test.invalid/avatar.jpg?size=128'
  );
});

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const flush = () => new Promise(setImmediate);
function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  return Object.values(node)
    .map((child) => find(child, predicate))
    .find(Boolean);
}
function screenHarness(overrides = {}) {
  const calls = {
    permission: 0,
    picker: 0,
    upload: [],
    persist: [],
    alerts: [],
    links: [],
    stateWrites: 0,
  };
  let revision = 0;
  let current = { uid: 'A', getIdToken: () => overrides.token?.() ?? Promise.resolve('token-A') };
  let demo = false;
  const states = [],
    cleanups = [];
  let cursor = 0;
  const state = () => ({ user: current, userProfile: { photoURL: filePath }, isDemo: demo });
  const jsx = (type, props) => ({ type, props });
  const Screen = load('src/screens/profile/ProfileScreen.tsx', {
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (value) => {
            calls.stateWrites++;
            states[index] = value;
          },
        ];
      },
      useRef: (initial) => {
        const index = cursor++;
        return (states[index] ||= { current: initial });
      },
      useEffect: (effect) => {
        if (!cleanups.length) cleanups.push(effect());
      },
      useCallback: (callback) => callback,
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      ...Object.fromEntries(
        [
          'View',
          'Text',
          'ScrollView',
          'TouchableOpacity',
          'Image',
          'ActivityIndicator',
          'RefreshControl',
        ].map((name) => [name, name])
      ),
      StyleSheet: { create: (value) => value },
      Alert: { alert: (...args) => calls.alerts.push(args) },
      Linking: { openURL: (url) => calls.links.push(url) },
    },
    '@react-navigation/native': { useFocusEffect() {} },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '../../store/authStore': {
      useAuthStore: Object.assign(state, { getState: state }),
      captureAccountSession: () => {
        const owner = current,
          captured = revision;
        return {
          uid: owner.uid,
          user: owner,
          isCurrent: () => current === owner && captured === revision && !demo,
        };
      },
    },
    '../../services/storage': { default: {} },
    'expo-image-picker': {
      MediaTypeOptions: { Images: 'Images' },
      requestMediaLibraryPermissionsAsync: () => {
        calls.permission++;
        return overrides.permission?.() ?? Promise.resolve({ granted: true });
      },
      launchImageLibraryAsync: () => {
        calls.picker++;
        return overrides.picker?.() ?? Promise.resolve({ canceled: false, assets: [asset] });
      },
    },
    'expo-constants': { default: {} },
    '../../lib/api': {
      default: {
        uploadProfilePicture: (...args) => {
          calls.upload.push(args);
          return overrides.upload?.() ?? Promise.resolve({ profileImageUrl: photoURL });
        },
      },
      resolveProfilePhotoUrl: apiHarness().resolveProfilePhotoUrl,
    },
    '../../lib/firebase': {
      updateUserProfile: (...args) => {
        calls.persist.push(args);
        return overrides.persist?.() ?? Promise.resolve();
      },
    },
    '../../i18n': { t: (key) => key },
    '../../theme/ThemeProvider': {
      useTheme: () => ({ color: (value) => value }),
      useThemedStyles: (value) => value,
    },
    '../../hooks/useSubscription': { useSubscription: () => ({ status: 'loading' }) },
    '../../hooks/useCoinBalance': { useCoinBalance: () => ({}) },
    '../../lib/subscriptionAvailability': { areNewSubscriptionsAvailable: () => false },
    '../../lib/userStats': {},
  }).default;
  const render = () => {
    cursor = 0;
    return Screen({ navigation: {} });
  };
  const button = () =>
    find(render(), (node) => node.props?.['data-testid'] === 'button-change-avatar');
  return {
    calls,
    render,
    button,
    press: () => button().props.onPress(),
    demo: () => {
      demo = true;
    },
    switchAccount: (uid) => {
      revision++;
      current = { uid, getIdToken: async () => `token-${uid}` };
    },
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}

test('one picker/upload; success waits for owner profile persistence, image uses no bearer', async () => {
  const save = deferred();
  const h = screenHarness({ persist: () => save.promise });
  const pending = h.press();
  await h.press();
  await flush();
  assert.equal(h.calls.permission, 1);
  assert.equal(h.calls.picker, 1);
  assert.deepEqual(h.calls.upload, [[asset, 'token-A']]);
  assert.deepEqual(h.calls.persist, [['A', { photoURL }]]);
  assert.equal(h.calls.alerts.length, 0);
  assert.equal(h.button().props.disabled, true);
  save.resolve();
  await pending;
  assert.deepEqual(h.calls.alerts, [['success', 'profile_picture_updated_successfully']]);
  assert.equal(h.button().props.disabled, false);
  assert.deepEqual(find(h.render(), (node) => node.type === 'Image').props.source, {
    uri: photoURL,
  });
});

for (const phase of ['permission', 'picker', 'token', 'upload', 'persist']) {
  test(`A→B→A invalidates delayed ${phase} work and suppresses stale UI`, async () => {
    const gate = deferred();
    const h = screenHarness({ [phase]: () => gate.promise });
    const pending = h.press();
    await flush();
    const writes = h.calls.stateWrites;
    h.switchAccount('B');
    h.switchAccount('A');
    gate.resolve(
      phase === 'permission'
        ? { granted: true }
        : phase === 'picker'
          ? { canceled: false, assets: [asset] }
          : { profileImageUrl: photoURL }
    );
    await pending;
    assert.equal(h.calls.alerts.length, 0);
    assert.equal(h.calls.stateWrites, writes);
    assert.equal(h.button().props.disabled, false);
    if (['permission', 'picker', 'token'].includes(phase)) assert.equal(h.calls.upload.length, 0);
    if (phase === 'upload') assert.equal(h.calls.persist.length, 0);
  });
}

test('an old account response cannot clear the new account upload or persist its photo', async () => {
  const first = deferred(),
    second = deferred();
  let calls = 0;
  const h = screenHarness({ upload: () => (++calls === 1 ? first.promise : second.promise) });
  const a = h.press();
  await flush();
  h.switchAccount('B');
  const b = h.press();
  await flush();
  first.resolve({ profileImageUrl: photoURL });
  await a;
  assert.equal(h.calls.persist.length, 0);
  assert.equal(h.calls.alerts.length, 0);
  assert.equal(h.button().props.disabled, true);
  second.resolve({ profileImageUrl: photoURL });
  await b;
  assert.deepEqual(h.calls.persist, [['B', { photoURL }]]);
  assert.deepEqual(
    h.calls.upload.map((args) => args[1]),
    ['token-A', 'token-B']
  );
  assert.equal(h.calls.alerts.length, 1);
  assert.equal(h.button().props.disabled, false);
});

test('profile support and privacy actions open the published pages', () => {
  const h = screenHarness();
  for (const label of ['help_support', 'privacy_policy']) {
    const row = find(
      h.render(),
      (node) =>
        node.type === 'TouchableOpacity' &&
        find(
          node.props.children,
          (child) => child.type === 'Text' && child.props.children === label
        )
    );
    assert(row, `Missing menu action ${label}`);
    row.props.onPress();
  }
  assert.deepEqual(h.calls.links, [
    'https://berkemd.github.io/wristsuite/lilove/support.html',
    'https://berkemd.github.io/wristsuite/lilove/privacy.html',
  ]);
});

test('failed profile mirror never claims success; unknown upload result remains explicit', async () => {
  const failed = screenHarness({
    persist: async () => {
      throw new Error('write denied');
    },
  });
  await failed.press();
  assert.deepEqual(failed.calls.alerts, [['error', 'profile_photo_save_incomplete']]);
  const uncertain = screenHarness({
    upload: async () => {
      throw { outcomeUnknown: true };
    },
  });
  await uncertain.press();
  assert.deepEqual(uncertain.calls.alerts, [['error', 'request_outcome_unknown']]);
  assert.equal(uncertain.calls.persist.length, 0);
});

test('demo, denied permission and picker cancellation never upload', async () => {
  const demo = screenHarness();
  demo.demo();
  await demo.press();
  assert.equal(demo.calls.permission, 0);
  assert.deepEqual(demo.calls.alerts, [['error', 'not_available_in_demo_mode']]);
  const denied = screenHarness({ permission: async () => ({ granted: false }) });
  await denied.press();
  assert.equal(denied.calls.picker, 0);
  assert.equal(denied.calls.upload.length, 0);
  const canceled = screenHarness({ picker: async () => ({ canceled: true }) });
  await canceled.press();
  assert.equal(canceled.calls.upload.length, 0);
  assert.equal(canceled.calls.alerts.length, 0);
});

test('unmounted or switched screens suppress delayed error and loading writes', async () => {
  for (const leave of ['unmount', 'switch']) {
    const gate = deferred();
    const h = screenHarness({ persist: () => gate.promise });
    const pending = h.press();
    await flush();
    const writes = h.calls.stateWrites;
    if (leave === 'unmount') h.unmount();
    else h.switchAccount('B');
    gate.reject(new Error('offline'));
    await pending;
    assert.equal(h.calls.alerts.length, 0);
    assert.equal(h.calls.stateWrites, writes);
  }
});

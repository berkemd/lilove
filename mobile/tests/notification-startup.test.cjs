const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function load(relative, imports) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'console', code)(
    (name) => {
      assert(name in imports, `Unexpected dependency: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    { log() {}, error() {} }
  );
  return module.exports;
}

function harness({
  platform = 'ios',
  fail,
  existing = 'granted',
  requested = 'granted',
  after,
} = {}) {
  const calls = [];
  const boundary = async (name, value) => {
    calls.push(name);
    after?.(name);
    if (fail === name) throw new Error(`${name} unavailable`);
    return value;
  };
  const service = load('src/services/notifications.ts', {
    'expo-notifications': {
      setNotificationHandler() {},
      AndroidImportance: { MAX: 5 },
      setNotificationChannelAsync: () => boundary('channel'),
      getPermissionsAsync: () => boundary('permissions', { status: existing }),
      requestPermissionsAsync: () => boundary('request', { status: requested }),
      getExpoPushTokenAsync: () => boundary('token', { data: 'synthetic-token' }),
    },
    'expo-device': { isDevice: true },
    'react-native': { Platform: { OS: platform } },
    'expo-constants': {
      default: { expoConfig: { extra: { eas: { projectId: 'synthetic-project' } } } },
    },
    '../lib/api': {
      api: {
        updatePushToken: (_token, authorization) => {
          assert.equal(authorization, 'session-A');
          return boundary('backend');
        },
      },
    },
    './tokenManager': { tokenManager: { getToken: async () => 'session-A' } },
  }).notificationService;
  return { service, calls };
}

for (const fail of ['permissions', 'request', 'channel', 'token']) {
  test(`physical registration contains ${fail} failure without downstream calls`, async () => {
    const { service, calls } = harness({
      fail,
      platform: fail === 'channel' ? 'android' : 'ios',
      existing: fail === 'request' ? 'undetermined' : 'granted',
    });
    assert.equal(await service.registerForPushNotifications(), null);
    assert.equal(calls.at(-1), fail);
    assert.equal(service.getPushToken(), null);
    assert(!calls.includes('backend'));
  });
}

test('denied permission does not fetch or send a token', async () => {
  const { service, calls } = harness({ existing: 'denied', requested: 'denied' });
  assert.equal(await service.registerForPushNotifications(), null);
  assert.deepEqual(calls, ['permissions', 'request']);
});

test('existing granted permission retains registration and backend delivery', async () => {
  const { service, calls } = harness();
  assert.equal(await service.registerForPushNotifications(), 'synthetic-token');
  assert.equal(service.getPushToken(), 'synthetic-token');
  assert.deepEqual(calls, ['permissions', 'token', 'backend']);
});

test('backend failure retains the device token and does not reject registration', async () => {
  const { service, calls } = harness({ fail: 'backend' });
  assert.equal(await service.registerForPushNotifications(), 'synthetic-token');
  assert.deepEqual(calls, ['permissions', 'token', 'backend']);
});

const { startOptionalServices } = load('src/services/appStartup.ts', {});
const settle = () => new Promise((resolve) => setImmediate(resolve));

for (const asynchronous of [false, true]) {
  test(`startup contains ${asynchronous ? 'async' : 'sync'} failures without blocking listeners`, async () => {
    const errors = [];
    let listeners = 0;
    let removed = 0;
    const fail = () => {
      if (asynchronous) return Promise.reject(new Error('unavailable'));
      throw new Error('unavailable');
    };
    const stop = startOptionalServices({
      initIAP: fail,

      setupListeners: () => {
        listeners++;
        return () => removed++;
      },
      onError: (service) => errors.push(service),
    });
    assert.equal(listeners, 1);
    await settle();
    assert.deepEqual(errors.sort(), ['storekit']);
    stop();
    stop();
    assert.equal(removed, 1);
  });
}

test('pending StoreKit cannot delay listener setup or cleanup', async () => {
  let resolveIAP;
  const pending = new Promise((resolve) => {
    resolveIAP = resolve;
  });
  let subscriptions = 0;
  const stop = startOptionalServices({
    initIAP: () => pending,
    setupListeners: () => {
      subscriptions++;
      return () => subscriptions--;
    },
    onError: () => assert.fail('Unexpected error'),
  });
  await settle();
  assert.equal(subscriptions, 1);
  stop();
  assert.equal(subscriptions, 0);
  resolveIAP();
  await settle();
  assert.equal(subscriptions, 0, 'Late initialization must not install listeners');
});

test('immediate unmount does not start deferred optional work', async () => {
  let starts = 0;
  let removals = 0;
  const stop = startOptionalServices({
    initIAP: async () => {
      starts++;
    },
    setupListeners: () => () => {
      removals++;
    },
    onError: () => assert.fail('Unexpected error'),
  });
  stop();
  await settle();
  assert.equal(starts, 0);
  assert.equal(removals, 1);
});

test('listener setup or cleanup errors remain contained and cleanup stays idempotent', async () => {
  for (const failAt of ['listeners', 'cleanup']) {
    const errors = [];
    const stop = startOptionalServices({
      initIAP: async () => {},
      setupListeners: () => {
        if (failAt === 'listeners') throw new Error('setup failed');
        return () => {
          throw new Error('cleanup failed');
        };
      },
      onError: (service) => errors.push(service),
    });
    stop();
    stop();
    await settle();
    assert.deepEqual(errors, [failAt]);
  }
});

test('partial native listener setup releases the first subscription', () => {
  let removed = 0;
  const first = {};
  const { notificationService } = load('src/services/notifications.ts', {
    'expo-notifications': {
      setNotificationHandler() {},
      addNotificationReceivedListener: () => first,
      addNotificationResponseReceivedListener: () => {
        throw new Error('response unavailable');
      },
      removeNotificationSubscription: (subscription) => {
        assert.equal(subscription, first);
        removed++;
      },
    },
    'expo-device': {},
    'react-native': {},
    'expo-constants': {},
    '../lib/api': {},
    './tokenManager': {},
  });
  assert.throws(() => notificationService.setupNotificationListeners(), /response unavailable/);
  assert.equal(removed, 1);
});

test('both native subscriptions are released even when the first removal fails', () => {
  const calls = [];
  const { notificationService } = load('src/services/notifications.ts', {
    'expo-notifications': {
      setNotificationHandler() {},
      addNotificationReceivedListener: () => 'received',
      addNotificationResponseReceivedListener: () => 'response',
      removeNotificationSubscription: (subscription) => {
        calls.push(subscription);
        if (subscription === 'received') throw new Error('remove failed');
      },
    },
    'expo-device': {},
    'react-native': {},
    'expo-constants': {},
    '../lib/api': {},
    './tokenManager': {},
  });
  assert.throws(notificationService.setupNotificationListeners(), /remove failed/);
  assert.deepEqual(calls, ['received', 'response']);
});

for (const staleAt of ['channel', 'permissions', 'request', 'token']) {
  test(`session ending during ${staleAt} stops subsequent notification work`, async () => {
    let current = true;
    const { service, calls } = harness({
      platform: staleAt === 'channel' ? 'android' : 'ios',
      existing: staleAt === 'request' ? 'undetermined' : 'granted',
      after: (name) => {
        if (name === staleAt) current = false;
      },
    });
    assert.equal(await service.registerForPushNotifications(() => current), null);
    assert.equal(calls.at(-1), staleAt);
    assert(!calls.includes('backend'));
    assert.equal(service.getPushToken(), null);
  });
}

test('an invalidated session cannot request permission or publish a device token', async () => {
  const { service, calls } = harness();
  assert.equal(await service.registerForPushNotifications(() => false), null);
  assert.deepEqual(calls, []);
});

test('account change during fresh credential lookup prevents backend dispatch', async () => {
  let finishCredential;
  let current = true;
  let writes = 0;
  const credential = new Promise((resolve) => {
    finishCredential = resolve;
  });
  const { notificationService } = load('src/services/notifications.ts', {
    'expo-notifications': { setNotificationHandler() {} },
    'expo-device': {},
    'react-native': {},
    'expo-constants': {},
    '../lib/api': {
      api: {
        updatePushToken: async () => {
          writes++;
        },
      },
    },
    './tokenManager': {
      tokenManager: {
        getToken: (options) => {
          assert.deepEqual(options, { fresh: true });
          return credential;
        },
      },
    },
  });
  const saving = notificationService.sendTokenToBackend('device-token', () => current);
  current = false;
  finishCredential('session-B');
  await saving;
  assert.equal(writes, 0);
});

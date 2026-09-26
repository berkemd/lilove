const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('../node_modules/typescript');
const source = ts.transpileModule(
  fs.readFileSync(require.resolve('../src/theme/theme.ts'), 'utf8'),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }
).outputText;
const loaded = { exports: {} };
new Function('module', 'exports', source)(loaded, loaded.exports);
const { ThemePreference, THEME_STORAGE_KEY, themeColor, themeStyle } = loaded.exports;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

test('first use follows the system; saved explicit choice survives a new session', async () => {
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
  const first = new ThemePreference(storage);
  await first.initialize();
  assert.deepEqual(first.getSnapshot(), { mode: null, ready: true, saving: false });
  await first.setDarkMode(true);
  assert.equal(values.get(THEME_STORAGE_KEY), 'dark');
  const restarted = new ThemePreference(storage);
  await restarted.initialize();
  assert.equal(restarted.getSnapshot().mode, 'dark');
  await restarted.setDarkMode(false);
  const again = new ThemePreference(storage);
  await again.initialize();
  assert.equal(again.getSnapshot().mode, 'light');
});

test('a pending hydration cannot overwrite a newer explicit selection', async () => {
  const read = deferred();
  const writes = [];
  const preference = new ThemePreference({
    getItem: () => read.promise,
    setItem: async (...args) => writes.push(args),
  });
  const starting = preference.initialize();
  const change = preference.setDarkMode(true);
  assert.equal(preference.getSnapshot().ready, false);
  read.resolve('light');
  await Promise.all([starting, change]);
  assert.equal(preference.getSnapshot().mode, 'dark');
  assert.deepEqual(writes, [[THEME_STORAGE_KEY, 'dark']]);
});

test('a failed save keeps the visible choice and allows a later retry', async () => {
  let fail = true;
  const preference = new ThemePreference({
    getItem: async () => 'light',
    setItem: async () => {
      if (fail) throw new Error('disk unavailable');
    },
  });
  await preference.initialize();
  await assert.rejects(preference.setDarkMode(true), /disk unavailable/);
  assert.deepEqual(preference.getSnapshot(), { mode: 'light', ready: true, saving: false });
  fail = false;
  await preference.setDarkMode(true);
  assert.equal(preference.getSnapshot().mode, 'dark');
});

test('rapid switches cannot race concurrent storage writes', async () => {
  const write = deferred();
  const calls = [];
  const preference = new ThemePreference({
    getItem: async () => 'light',
    setItem: async (...args) => {
      calls.push(args);
      await write.promise;
    },
  });
  await preference.initialize();
  const first = preference.setDarkMode(true);
  await Promise.resolve();
  assert.equal(preference.getSnapshot().saving, true);
  await preference.setDarkMode(false);
  assert.equal(calls.length, 1);
  write.resolve();
  await first;
  assert.equal(preference.getSnapshot().mode, 'dark');
});

test('invalid or unreadable stored preferences do not stop the app opening', async () => {
  for (const getItem of [
    async () => 'corrupt',
    async () => {
      throw new Error('read failed');
    },
  ]) {
    const preference = new ThemePreference({ getItem, setItem: async () => {} });
    await preference.initialize();
    assert.equal(preference.getSnapshot().ready, true);
    assert.equal(preference.getSnapshot().mode, null);
    await preference.setDarkMode(true);
    assert.equal(preference.getSnapshot().mode, 'dark');
  }
});

test('theme notifications stop after unsubscribe and snapshots are stable between changes', async () => {
  const preference = new ThemePreference({ getItem: async () => null, setItem: async () => {} });
  let notifications = 0;
  const stop = preference.subscribe(() => notifications++);
  assert.equal(preference.getSnapshot(), preference.getSnapshot());
  await preference.initialize();
  assert.equal(notifications, 1);
  stop();
  await preference.setDarkMode(true);
  assert.equal(notifications, 1);
});

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('dark body text and semantic labels maintain readable contrast on their surfaces', () => {
  for (const [foreground, background] of [
    ['#111827', '#FFFFFF'],
    ['#333333', '#FFFFFF'],
    ['#666666', '#F5F5F5'],
    ['#065F46', '#D1FAE5'],
    ['#047857', '#D1FAE5'],
    ['#991B1B', '#FEF2F2'],
    ['#6B7280', '#F9FAFB'],
    ['#4B5563', '#F3F4F6'],
    ['#8B5CF6', '#EDE9FE'],
    ['#059669', '#D1FAE5'],
    ['#EF4444', '#FEE2E2'],
  ]) {
    assert.ok(
      contrast(themeColor(foreground, true), themeColor(background, true, 'background')) >= 4.5
    );
  }
});

test('style adaptation preserves layout and colored-button white labels without mutating the source', () => {
  const base = {
    padding: 16,
    color: '#111827',
    backgroundColor: '#FFF',
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    transform: [{ scale: 1 }],
  };
  const adapted = themeStyle(base, true);
  assert.equal(themeStyle(base, false), base);
  assert.equal(base.color, '#111827');
  assert.equal(adapted.padding, 16);
  assert.equal(adapted.transform, base.transform);
  assert.equal(adapted.shadowColor, '#000');
  assert.notEqual(adapted.color, base.color);
  assert.notEqual(adapted.backgroundColor, base.backgroundColor);
  assert.equal(themeColor('#FFFFFF', true), '#FFFFFF');
  assert.equal(themeColor('#8B5CF6', true, 'background'), '#8B5CF6');
  assert.equal(themeStyle({ fontSize: 16 }, true).color, '#F1F5F9');
  assert.equal(themeColor('rgba(0,0,0,0.5)', true, 'background'), 'rgba(0,0,0,0.5)');
});

test('sign-out removes account data while keeping the device appearance across restart', async () => {
  const values = new Map([
    [THEME_STORAGE_KEY, 'dark'],
    ['cached-personal-note', 'private'],
    ['auth-token', 'token'],
  ]);
  const storageMock = {
    getAllKeys: async () => [...values.keys()],
    multiRemove: async (keys) => keys.forEach((key) => values.delete(key)),
  };
  const compiled = ts.transpileModule(
    fs.readFileSync(require.resolve('../src/services/storage.ts'), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }
  ).outputText;
  const service = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    (name) => {
      if (name === '@react-native-async-storage/async-storage') return { default: storageMock };
      if (name === '../theme/theme') return loaded.exports;
      throw new Error('Unexpected dependency: ' + name);
    },
    service,
    service.exports
  );
  await service.exports.default.clear();
  assert.deepEqual([...values.keys()], [THEME_STORAGE_KEY]);
  const restarted = new ThemePreference({
    getItem: async (key) => values.get(key),
    setItem: async (key, value) => values.set(key, value),
  });
  await restarted.initialize();
  assert.equal(restarted.getSnapshot().mode, 'dark');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const ts = require('../node_modules/typescript');
const { resolveApiOrigin } = require('../config/apiOrigin.cjs');

test('debug without an override retains the historical origin; only exact flags select release', () => {
  for (const env of [
    {},
    { CI: '1' },
    { LILOVE_RELEASE_BUILD: 'true' },
    { LILOVE_RELEASE_BUILD: '0' },
    { EAS_BUILD_PROFILE: 'preview' },
    { EAS_BUILD_PROFILE: 'Production' },
  ]) {
    assert.equal(resolveApiOrigin(env), 'https://lilove.org');
  }
  for (const env of [
    { LILOVE_RELEASE_BUILD: '1' },
    { EAS_BUILD_PROFILE: 'production' },
    { LILOVE_RELEASE_BUILD: '0', EAS_BUILD_PROFILE: 'production' },
  ]) {
    assert.throws(() => resolveApiOrigin(env), /EXPO_PUBLIC_API_URL.*required/);
  }
});

test('HTTPS origins normalize host casing, default port and a single trailing slash', () => {
  for (const [input, output] of [
    ['https://api.example.test', 'https://api.example.test'],
    ['https://API.EXAMPLE.TEST:443/', 'https://api.example.test'],
    ['https://api.example.test:8443/', 'https://api.example.test:8443'],
  ]) {
    assert.equal(
      resolveApiOrigin({ EXPO_PUBLIC_API_URL: input, LILOVE_RELEASE_BUILD: '1' }),
      output
    );
  }
});

for (const input of [
  '',
  ' ',
  'http://api.example.test',
  'ftp://api.example.test',
  'api.example.test',
  'https:api.example.test',
  'https://api.example.test/api',
  'https://api.example.test/..',
  'https://api.example.test//',
  'https://api.example.test/?',
  'https://api.example.test/#',
  'https://api.example.test?token=fixture-secret',
  'https://fixture-user:fixture-secret@api.example.test',
  'https://@api.example.test',
  'https://api.example.test/#fixture-secret',
  'https://api.example.test/\n',
  ' https://api.example.test',
  'https://api.example.test\\',
  'https://',
  null,
  123,
]) {
  test(`invalid explicit origin is rejected in debug and release (case ${JSON.stringify(input).length})`, () => {
    for (const release of [undefined, '1']) {
      assert.throws(
        () => resolveApiOrigin({ EXPO_PUBLIC_API_URL: input, LILOVE_RELEASE_BUILD: release }),
        (error) => {
          assert(error instanceof Error);
          assert.equal(error.message.includes('fixture-secret'), false);
          assert.equal(error.message.includes('fixture-user'), false);
          assert.equal(error.message.includes('api.example.test'), false);
          return true;
        }
      );
    }
  });
}

test('the protected QA host is allowed only as an explicit nonrelease origin', () => {
  const qa = 'https://lilove-qa.onrender.com';
  assert.equal(resolveApiOrigin({ EXPO_PUBLIC_API_URL: qa }), qa);
  for (const input of [qa, `${qa}/`, 'https://LILOVE-QA.ONRENDER.COM:443', `${qa}.`]) {
    for (const flag of [{ LILOVE_RELEASE_BUILD: '1' }, { EAS_BUILD_PROFILE: 'production' }]) {
      assert.throws(
        () => resolveApiOrigin({ ...flag, EXPO_PUBLIC_API_URL: input }),
        /QA.*release/i
      );
    }
  }
});

test('release rejects the inactive domain and its subdomains across canonical host variants', () => {
  for (const input of [
    'https://lilove.org',
    'https://LILOVE.ORG:443/',
    'https://lilove.org.',
    'https://www.lilove.org',
    'https://api.lilove.org:8443/',
    'https://nested.api.lilove.org.',
  ]) {
    assert.equal(resolveApiOrigin({ EXPO_PUBLIC_API_URL: input }), new URL(input).origin);
    for (const flag of [{ LILOVE_RELEASE_BUILD: '1' }, { EAS_BUILD_PROFILE: 'production' }]) {
      assert.throws(
        () => resolveApiOrigin({ ...flag, EXPO_PUBLIC_API_URL: input }),
        (error) => {
          assert.match(error.message, /inactive.*release.*verified HTTPS origin/i);
          assert.equal(error.message.includes(input), false);
          return true;
        }
      );
    }
  }
});

test('the inactive-domain boundary does not block unrelated HTTPS provider domains', () => {
  for (const input of [
    'https://provider.example.test',
    'https://notlilove.org',
    'https://lilove.org.example.test',
  ]) {
    assert.equal(
      resolveApiOrigin({ LILOVE_RELEASE_BUILD: '1', EXPO_PUBLIC_API_URL: input }),
      input
    );
  }
});

// Run the installed Expo config evaluator in a child with an explicit fixture-only
// environment. Do not load .env files or print the full public configuration.
const configScript = `
const { getConfig } = require('@expo/config');
try {
  const { exp } = getConfig(process.cwd(), { skipPlugins: true, isPublicConfig: true });
  const production = require('./eas.json').build.production.env;
  const schemes = (exp.ios.infoPlist.CFBundleURLTypes || []).flatMap(value => value.CFBundleURLSchemes || []);
  const client = production.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  console.log(JSON.stringify({
    ok: true,
    apiOrigin: exp.extra.apiUrl,
    firebaseFixturePreserved: exp.extra.firebase.apiKey === 'fixture-key' && exp.extra.firebase.appId === 'fixture-app-id',
    firebaseProjectPresent: typeof exp.extra.firebase.projectId === 'string' && exp.extra.firebase.projectId.length > 0,
    googleSchemeMatches: typeof client === 'string' && schemes.includes(client.split('.').reverse().join('.')),
    googleWebClientPresent: typeof production.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID === 'string' && production.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.length > 0,
    bundleIdentifierPresent: typeof exp.ios.bundleIdentifier === 'string' && exp.ios.bundleIdentifier.length > 0
  }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, message: error.message }));
}
`;
function expoConfig(overrides = {}) {
  const child = spawnSync(process.execPath, ['-e', configScript], {
    cwd: path.join(__dirname, '..'),
    env: { FIREBASE_API_KEY: 'fixture-key', FIREBASE_APP_ID: 'fixture-app-id', ...overrides },
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, 'Expo fixture process must exit normally');
  return JSON.parse(child.stdout);
}

test('installed Expo evaluates the ESM config and preserves auth fields while wiring the normalized origin', () => {
  const config = expoConfig({
    LILOVE_RELEASE_BUILD: '1',
    EXPO_PUBLIC_API_URL: 'https://API.EXAMPLE.TEST:443/',
  });
  assert.equal(config.ok, true);
  assert.equal(config.apiOrigin, 'https://api.example.test');
  assert.equal(config.firebaseFixturePreserved, true);
  assert.equal(config.firebaseProjectPresent, true);
  assert.equal(config.googleSchemeMatches, true);
  assert.equal(config.googleWebClientPresent, true);
  assert.equal(config.bundleIdentifierPresent, true);
});

test('actual Expo config enforces release missing/QA/invalid inputs without exposing credentials', () => {
  for (const overrides of [
    { LILOVE_RELEASE_BUILD: '1' },
    { EAS_BUILD_PROFILE: 'production' },
    { EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_API_URL: 'https://lilove.org' },
    { LILOVE_RELEASE_BUILD: '1', EXPO_PUBLIC_API_URL: 'https://lilove-qa.onrender.com' },
    { EXPO_PUBLIC_API_URL: 'https://fixture-user:fixture-secret@api.example.test' },
  ]) {
    const result = expoConfig(overrides);
    assert.equal(result.ok, false);
    assert.equal(result.message.includes('fixture-user'), false);
    assert.equal(result.message.includes('fixture-secret'), false);
  }
  assert.equal(expoConfig({ CI: '1' }).apiOrigin, 'https://lilove.org');
});

function actualApi(origin, override) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/lib/api.ts'), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }
  ).outputText;
  const module = { exports: {} };
  const urls = [];
  const imports = {
    'expo-constants': { default: { expoConfig: { extra: { apiUrl: origin } } } },
    '../services/tokenManager': { tokenManager: { getToken: async () => 'fixture-token' } },
    './demoData': { DEMO_TOKEN: 'demo' },
    '../i18n': { t: (key) => key },
    './habits': { createHabitsApi: () => ({}) },
  };
  new Function('require', 'module', 'exports', 'process', 'console', 'fetch', source)(
    (name) => {
      assert(name in imports, `Unexpected dependency: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    { env: { EXPO_PUBLIC_API_URL: override } },
    { log() {} },
    async (url) => {
      urls.push(url);
      return { ok: true, json: async () => [] };
    }
  );
  return { api: module.exports.api, urls };
}

test('actual API requests prefer canonical Expo origin to the raw environment override', async () => {
  const configured = expoConfig({
    LILOVE_RELEASE_BUILD: '1',
    EXPO_PUBLIC_API_URL: 'https://API.EXAMPLE.TEST/',
  });
  assert.equal(configured.ok, true);
  const { api, urls } = actualApi(configured.apiOrigin, 'https://API.EXAMPLE.TEST/');
  await api.getGoals();
  assert.deepEqual(urls, ['https://api.example.test/api/goals']);
});

test('legacy API fallback still uses explicit env only when Expo origin is absent', async () => {
  const { api, urls } = actualApi(undefined, 'https://legacy.example.test');
  await api.getGoals();
  assert.deepEqual(urls, ['https://legacy.example.test/api/goals']);
});

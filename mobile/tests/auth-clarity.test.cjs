const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function load(relative, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'console', source)(
    (name) => {
      assert(name in imports, `Unexpected dependency ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    { log() {}, error() {} }
  );
  return module.exports;
}

// Execute the screen's real closure without mocking its cancellation/error decisions.
const filename = path.join(__dirname, '../src/screens/auth/LoginScreen.tsx');
const sourceText = fs.readFileSync(filename, 'utf8');
const screen = ts.createSourceFile(
  filename,
  sourceText,
  ts.ScriptTarget.ES2020,
  true,
  ts.ScriptKind.TSX
);
const handlerSources = new Map();
function visit(node) {
  if (
    ts.isVariableDeclaration(node) &&
    [
      'handleAppleSignIn',
      'handleGoogleResponse',
      'handleGoogleSignIn',
      'demoBaslat',
      'handleLogin',
    ].includes(node.name.getText(screen))
  )
    handlerSources.set(node.name.getText(screen), node.initializer.getText(screen));
  ts.forEachChild(node, visit);
}
visit(screen);
assert.equal(handlerSources.size, 5, 'Login handlers must remain discoverable in the screen');

function harness(language, result, loginFailure) {
  const translations = load(`src/i18n/${language}.ts`)[language];
  const t = (key) => {
    assert(key in translations, `Missing ${language} translation ${key}`);
    return translations[key];
  };
  const alerts = [],
    calls = [];
  const service = load('src/services/appleAuth.ts', {
    'expo-apple-authentication': {
      AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
      signInAsync: async () => {
        calls.push('native');
        return result();
      },
    },
    'react-native': { Platform: { OS: 'ios' } },
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'SHA256' },
      getRandomBytes: (count) => new Uint8Array(count).fill(7),
      digestStringAsync: async () => 'hashed-test-nonce',
    },
    '../i18n': { t },
  }).default;
  const handler = ts.transpileModule(
    `const handler = ${handlerSources.get('handleAppleSignIn')};`,
    {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }
  ).outputText;
  const run = new Function(
    'clearError',
    'appleAuth',
    'appleLogin',
    'Alert',
    't',
    `${handler}; return handler;`
  )(
    () => calls.push('clear'),
    service,
    async (value) => {
      calls.push({ login: value });
      if (loginFailure) throw loginFailure;
    },
    { alert: (...args) => alerts.push(args) },
    t
  );
  return { run, alerts, calls, t };
}

for (const language of ['tr', 'en']) {
  test(`${language}: actual Apple service cancellation stays silent and never exchanges credentials`, async () => {
    const h = harness(language, () => {
      throw {
        code: 'ERR_REQUEST_CANCELED',
        message: 'User cancelled authorization',
      };
    });
    await h.run();
    assert.deepEqual(h.alerts, []);
    assert.deepEqual(h.calls, ['clear', 'native']);
  });
  test(`${language}: unknown English SDK error becomes safe localized copy`, async () => {
    const raw = 'The authorization attempt failed for an unknown reason';
    const h = harness(language, () => {
      throw new Error(raw);
    });
    await h.run();
    assert.deepEqual(h.alerts, [[h.t('apple_sign_in_failed'), h.t('please_try_again')]]);
    assert(!JSON.stringify(h.alerts).includes(raw));
    assert.deepEqual(h.calls, ['clear', 'native']);
  });
}

test('successful Apple sign-in still passes the same credentials and nonce to the existing login', async () => {
  const h = harness('tr', () => ({
    identityToken: 'owned-test-token',
    authorizationCode: 'owned-test-code',
    fullName: { givenName: 'Test', familyName: 'User' },
  }));
  await h.run();
  assert.deepEqual(h.alerts, []);
  assert.deepEqual(h.calls, [
    'clear',
    'native',
    {
      login: {
        identityToken: 'owned-test-token',
        authorizationCode: 'owned-test-code',
        nonce: '07'.repeat(32),
        fullName: { givenName: 'Test', familyName: 'User' },
      },
    },
  ]);
});

test('Firebase exchange failure uses the same localized safe message', async () => {
  const h = harness(
    'tr',
    () => ({ identityToken: 'owned-test-token' }),
    new Error('raw Firebase SDK details')
  );
  await h.run();
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.alerts, [[h.t('apple_sign_in_failed'), h.t('please_try_again')]]);
});

test('login separator reads auth_or and all seven locale values exist', () => {
  let localizedSeparator = false;
  const inspect = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(screen) === 't' &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text === 'auth_or'
    )
      localizedSeparator = true;
    ts.forEachChild(node, inspect);
  };
  inspect(screen);
  assert(localizedSeparator, 'Login must render its localized separator');
  for (const [language, expected] of Object.entries({
    en: 'OR',
    tr: 'VEYA',
    de: 'ODER',
    es: 'O',
    fr: 'OU',
    it: 'O',
    ja: 'または',
  })) {
    assert.equal(load(`src/i18n/${language}.ts`)[language].auth_or, expected);
  }
});

function googleHarness(
  language,
  googleResponse,
  { loginFailure, promptFailure, promptResult } = {}
) {
  const translations = load(`src/i18n/${language}.ts`)[language];
  const t = (key) => {
    assert(key in translations);
    return translations[key];
  };
  const alerts = [],
    calls = [];
  const { getIdTokenFromResponse } = load('src/services/googleAuth.ts', {
    'expo-auth-session/providers/google': {},
    'expo-web-browser': { maybeCompleteAuthSession() {} },
    'react-native': { Platform: { OS: 'ios' } },
  });
  const context = {
    googleResponse,
    getIdTokenFromResponse,
    t,
    setIsGoogleLoading: (value) => calls.push({ loading: value }),
    clearError: () => calls.push('clear'),
    googleLogin: async (value) => {
      calls.push({ login: value });
      if (loginFailure) throw loginFailure;
    },
    googlePromptAsync: async () => {
      calls.push('prompt');
      if (promptFailure) throw promptFailure;
      return promptResult;
    },
    Alert: { alert: (...args) => alerts.push(args) },
    console: { log() {}, error() {} },
  };
  const make = (name) => {
    const source = ts.transpileModule(`const handler = ${handlerSources.get(name)};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText;
    return new Function(...Object.keys(context), `${source}; return handler;`)(
      ...Object.values(context)
    );
  };
  return {
    response: make('handleGoogleResponse'),
    prompt: make('handleGoogleSignIn'),
    alerts,
    calls,
    t,
  };
}

for (const language of ['tr', 'en']) {
  test(`${language}: Google provider response and prompt errors show localized safe copy`, async () => {
    const raw = 'raw English OAuth provider error';
    const response = googleHarness(language, { type: 'error', error: { message: raw } });
    await response.response();
    assert.deepEqual(response.alerts, [
      [response.t('google_sign_in_failed'), response.t('authentication_failed')],
    ]);
    const prompt = googleHarness(language, null, { promptFailure: new Error(raw) });
    await prompt.prompt();
    assert.deepEqual(prompt.alerts, [
      [prompt.t('google_sign_in_failed'), prompt.t('please_try_again')],
    ]);
    assert(!JSON.stringify([...response.alerts, ...prompt.alerts]).includes(raw));
  });
  test(`${language}: Google Firebase exchange errors clear loading and use localized copy`, async () => {
    const h = googleHarness(
      language,
      { type: 'success', params: { id_token: 'owned-google-token' } },
      { loginFailure: new Error('raw Firebase details') }
    );
    await h.response();
    assert.deepEqual(h.alerts, [[h.t('google_sign_in_failed'), h.t('please_try_again')]]);
    assert.deepEqual(h.calls, [
      { loading: true },
      'clear',
      { login: { idToken: 'owned-google-token' } },
      { loading: false },
    ]);
  });
}

test('Google cancel/dismiss response and prompt results stay silent with no credential exchange', async () => {
  for (const type of ['cancel', 'dismiss']) {
    const h = googleHarness('tr', { type }, { promptResult: { type } });
    await h.response();
    assert.deepEqual(h.calls, []);
    await h.prompt();
    assert.deepEqual(h.calls, ['clear', 'prompt']);
    assert.deepEqual(h.alerts, []);
  }
});

test('Google success still exchanges the actual returned token and restores loading', async () => {
  const h = googleHarness('tr', {
    type: 'success',
    authentication: { idToken: 'owned-google-token' },
  });
  await h.response();
  assert.deepEqual(h.alerts, []);
  assert.deepEqual(h.calls, [
    { loading: true },
    'clear',
    { login: { idToken: 'owned-google-token' } },
    { loading: false },
  ]);
});

function boundHandler(name, context) {
  const source = ts.transpileModule(`const handler = ${handlerSources.get(name)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function(...Object.keys(context), `${source}; return handler;`)(
    ...Object.values(context)
  );
}

test('demo failure narrowing preserves Error and primitive failure messages without starting a session', async () => {
  for (const failure of [new Error('Local storage unavailable'), 'Local storage unavailable']) {
    const alerts = [];
    const handler = boundHandler('demoBaslat', {
      demoSifirla() {},
      DEMO_TOKEN: 'demo',
      tokenManager: {
        setToken: async () => {
          throw failure;
        },
      },
      useAuthStore: {
        setState: () => assert.fail('Failed token persistence must not start the session'),
      },
      demoProfil: () => ({}),
      t: (key) => key,
      Alert: { alert: (...args) => alerts.push(args) },
    });
    await handler();
    assert.deepEqual(alerts, [['could_not_start_the_tour', 'Local storage unavailable']]);
  }
});

test('email login narrowing preserves server copy, fallback and successful credential forwarding', async () => {
  for (const [failure, expected] of [
    [{ response: { data: { error: 'Known server error' } } }, 'Known server error'],
    [new Error('raw internal message'), 'please_check_your_credentials'],
    [null, null],
  ]) {
    const alerts = [],
      calls = [];
    const handler = boundHandler('handleLogin', {
      clearError: () => calls.push('clear'),
      email: 'owned@example.invalid',
      password: 'test-only-password',
      login: async (...args) => {
        calls.push(args);
        if (failure) throw failure;
      },
      t: (key) => key,
      Alert: { alert: (...args) => alerts.push(args) },
    });
    await handler();
    assert.deepEqual(calls, ['clear', ['owned@example.invalid', 'test-only-password']]);
    assert.deepEqual(alerts, expected ? [['login_failed', expected]] : []);
  }
});

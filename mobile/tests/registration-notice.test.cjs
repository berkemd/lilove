const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function render(register) {
  const filename =
    process.env.LILOVE_PROFILE_REGISTRATION_SOURCE ||
    path.join(__dirname, '../src/screens/auth/RegisterScreen.tsx');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  const alerts = [];
  const state = { register, isLoading: false, error: null, clearError() {} };
  const inputs = ['profile@example.invalid', 'fixture-only', 'fixture-only', 'Fixture'];
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: { useState: () => [inputs.shift(), () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': new Proxy(
      {
        StyleSheet: { create: (value) => value },
        Platform: { OS: 'ios' },
        Alert: { alert: (...args) => alerts.push(args) },
      },
      { get: (value, key) => value[key] || key }
    ),
    '../../store/authStore': { useAuthStore: () => state },
    '../../i18n': { t: (key) => key },
    '../../theme/ThemeProvider': {
      useThemedStyles: (value) => value,
      useTheme: () => ({ color: (value) => value }),
    },
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
  const tree = module.exports.default({ navigation: { navigate() {} } });
  const nodes = (node) => {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== 'object') return [];
    return [node, ...nodes(node.props?.children)];
  };
  const submit = nodes(tree).find(
    (node) =>
      node.type === 'TouchableOpacity' &&
      nodes(node).some((child) => child.props?.children === 'create_account')
  );
  assert(submit, 'The actual registration button must be present');
  return { submit: submit.props.onPress, alerts, state };
}

test('verification failure reports account creation even after authentication has changed the route', async () => {
  let reject;
  const pending = new Promise((_, fail) => {
    reject = fail;
  });
  const h = render(() => pending);
  const submitted = h.submit();
  // Auth observation can switch routes before mail delivery completes. The
  // already-started handler must still use the distinct outcome, not signup failure.
  Object.assign(h.state, { isAuthenticated: true, profileStatus: 'ready' });
  reject(
    Object.assign(new Error('verification_email_failed_body'), {
      code: 'auth/account-setup-incomplete',
    })
  );
  await submitted;
  assert.deepEqual(h.alerts, [
    ['verification_email_failed_title', 'verification_email_failed_body'],
  ]);
});

test('a registration or profile error retains the ordinary failure message', async () => {
  const h = render(async () => {
    throw new Error('Profile permission denied');
  });
  await h.submit();
  assert.deepEqual(h.alerts, [['registration_failed', 'Profile permission denied']]);
});

test('successful registration does not invent a delivered or verified-email notice', async () => {
  const h = render(async () => {});
  await h.submit();
  assert.deepEqual(h.alerts, []);
});

test('metadata and combined follow-up failures show their distinct saved-account explanations', async () => {
  for (const message of [
    'account_name_update_failed_body',
    'account_name_update_failed_body\n\nverification_email_failed_body',
  ]) {
    const h = render(async () => {
      throw Object.assign(new Error(message), { code: 'auth/account-setup-incomplete' });
    });
    await h.submit();
    assert.deepEqual(h.alerts, [['verification_email_failed_title', message]]);
  }
});

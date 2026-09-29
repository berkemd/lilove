const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');
function load(relative, imports = {}) {
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
  new Function('require', 'module', 'exports', code)(
    (name) => {
      assert(name in imports, name);
      return imports[name];
    },
    module,
    module.exports
  );
  return module.exports;
}
const adapter = load('src/lib/avatarPreview.ts');
function equipped(key, name, overrides = {}) {
  const zoneId = `opaque-${key}`;
  const traitId = `opaque-${name}`;
  return {
    id: `equipped-${key}`,
    zoneId,
    traitId,
    zone: { id: zoneId, key, name: key },
    trait: {
      id: traitId,
      zoneId,
      name,
      isActive: true,
      isDefault: true,
      coinCost: 0,
      unlockType: 'default',
      ...overrides,
    },
  };
}
const complete = () => [
  equipped('skin', 'Medium'),
  equipped('hair', 'Short'),
  equipped('hair_color', 'Brown'),
  equipped('clothing_top', 'T-Shirt'),
];
const resolve = adapter.resolveAvatarPreview;

test('all 18 canonical free variants map from verified equipped identities without mutating ownership', () => {
  for (const [zone, names] of Object.entries({
    skin: ['Light', 'Fair', 'Medium', 'Tan', 'Dark', 'Deep'],
    hair: ['Short', 'Long', 'Curly', 'Wavy', 'Bald'],
    hair_color: ['Black', 'Brown', 'Blonde', 'Red', 'Gray'],
    clothing_top: ['T-Shirt', 'Hoodie'],
  })) {
    for (const name of names) {
      const row = equipped(zone, name);
      const before = JSON.stringify(row);
      const model = resolve([row]);
      assert.deepEqual(model.shown, [{ zone, name }]);
      assert.deepEqual(model.unsupported, []);
      assert.equal(JSON.stringify(row), before);
    }
  }
  assert.deepEqual(resolve(complete()).missing, []);
  assert.deepEqual(
    resolve([
      equipped('skin', 'Light'),
      equipped('hair', 'Bald'),
      equipped('clothing_top', 'Hoodie'),
    ]).missing,
    []
  );
});

test('missing, malformed, inactive, paid, mismatched and duplicate selections never become invented visuals', () => {
  assert.equal(resolve([]).empty, true);
  assert.deepEqual(resolve([]).missing, ['skin', 'hair', 'hair_color', 'clothing_top']);
  for (const row of [
    null,
    {},
    equipped('skin', 'Medium', { id: 'other' }),
    equipped('skin', 'Medium', { zoneId: 'other' }),
    equipped('skin', 'Medium', { isActive: false }),
    equipped('skin', 'Medium', { coinCost: 10 }),
    equipped('skin', 'Medium', { unlockType: 'purchase' }),
    equipped('skin', 'Medium', { isDefault: false }),
    equipped('skin', 'Constructor'),
    { ...equipped('skin', 'Medium'), zoneId: 'different' },
  ]) {
    const model = resolve([row]);
    assert.equal(model.skin, null);
    assert.equal(model.shown.length, 0);
    assert.equal(model.unsupported.length, 1);
  }
  const duplicated = resolve([equipped('skin', 'Light'), equipped('skin', 'Deep')]);
  assert.equal(duplicated.skin, null);
  assert.equal(duplicated.unsupported.length, 2);
  const unsupported = equipped('aura', 'Paid glow', { coinCost: 2000, unlockType: 'purchase' });
  assert.deepEqual(resolve([...complete(), unsupported]).unsupported, ['Paid glow']);
  assert.equal(unsupported.trait.coinCost, 2000);
});

test('actual demo Warm/Waves/Tee mapping is explicit, demo-only and does not invent hair-color choices', () => {
  const demo = load('src/lib/demoData.ts', {
    '../i18n': { t: (key) => key },
  });
  // Source-backed demo API returns the same enriched rows used by AvatarScreen.
  return (async () => {
    const rows = await demo.demoCevap('GET', '/api/avatar-system/my-equipped');
    const model = resolve(rows, 'demo');
    assert.deepEqual(
      model.shown.map((x) => x.name),
      ['Warm', 'Waves', 'Tee']
    );
    assert.equal(model.hair, 'Wavy');
    assert.equal(model.top, 'T-Shirt');
    assert.deepEqual(model.missing, []);
    assert.equal(resolve(rows).shown.length, 0);
    assert.equal(resolve(complete(), 'demo').shown.length, 0);
  })();
});

const find = (node, testID) => {
  if (!node || typeof node !== 'object') return undefined;
  if (node.props?.testID === testID) return node;
  return Object.values(node)
    .map((item) => find(item, testID))
    .find(Boolean);
};
function render(rows, dark = false, locale = 'en') {
  const catalog = load(`src/i18n/${locale}.ts`)[locale];
  const element = (type, props) => ({ type, props });
  const Component = load('src/components/AvatarPreview.tsx', {
    react: { useState: () => [0, () => {}] },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: (x) => x } },
    'react-native-svg': {
      default: 'Svg',
      Path: 'Path',
      Circle: 'Circle',
      Ellipse: 'Ellipse',
      G: 'G',
    },
    '../theme/ThemeProvider': { useTheme: () => ({ isDark: dark }) },
    '../i18n': { t: (key) => catalog[key] },
    '../lib/avatarPreview': adapter,
  }).default;
  return Component({ equipped: rows });
}

test('actual SVG changes skin, hair shape/color and clothing, and keeps image descriptive and decorative paths hidden', () => {
  const first = render(complete());
  const changedRows = [
    equipped('skin', 'Deep'),
    equipped('hair', 'Curly'),
    equipped('hair_color', 'Red'),
    equipped('clothing_top', 'Hoodie'),
  ];
  const changed = render(changedRows);
  assert.notEqual(
    find(first, 'avatar-skin-tone').props.fill,
    find(changed, 'avatar-skin-tone').props.fill
  );
  assert.notEqual(find(first, 'avatar-hair').props.d, find(changed, 'avatar-hair').props.d);
  assert.notEqual(find(first, 'avatar-hair').props.fill, find(changed, 'avatar-hair').props.fill);
  assert.notEqual(find(first, 'avatar-top').props.d, find(changed, 'avatar-top').props.d);
  assert.equal(find(render([equipped('hair', 'Bald')]), 'avatar-hair'), undefined);
  const image = first.props.children[0];
  assert.equal(image.props.accessibilityRole, 'image');
  assert.match(image.props.accessibilityLabel, /Medium/);
  assert.equal(image.props.children.props.accessibilityElementsHidden, true);
  assert.equal(image.props.children.props.children.props.accessible, false);
  assert.equal(find(first, 'avatar-preview-status'), undefined);
  assert.notDeepEqual(render(complete(), true), first);
});

test('all seven locales explain empty/missing/unsupported cases with intact placeholders and wrapping text', () => {
  for (const lang of ['en', 'tr', 'de', 'fr', 'es', 'it', 'ja']) {
    const empty = find(render([], false, lang), 'avatar-preview-status');
    assert.equal(typeof empty.props.children, 'string');
    assert(empty.props.children.length > 15);
    const status = find(render([equipped('aura', 'Glow')], false, lang), 'avatar-preview-status');
    assert(status.props.children.includes('Glow'));
    assert(!status.props.children.includes('{features}'));
    assert.equal(status.props.numberOfLines, undefined);
    assert.equal(status.props.allowFontScaling, undefined);
  }
});

test('known catalog display names localize in all locales without changing identities or unknown ownership labels', () => {
  const catalog = {
    skin: ['Light', 'Fair', 'Medium', 'Tan', 'Dark', 'Deep'],
    hair: ['Short', 'Long', 'Curly', 'Wavy', 'Bald'],
    hair_color: ['Black', 'Brown', 'Blonde', 'Red', 'Gray'],
    clothing_top: ['T-Shirt', 'Hoodie'],
  };
  for (const locale of ['en', 'tr', 'de', 'fr', 'es', 'it', 'ja']) {
    const copy = load(`src/i18n/${locale}.ts`)[locale];
    for (const [zone, names] of Object.entries(catalog))
      for (const name of names) {
        const translated = adapter.avatarTraitLabel(zone, name, (key) => copy[key]);
        assert.equal(typeof translated, 'string');
        assert(translated.length > 0);
        const row = equipped(zone, name);
        resolve([row]);
        assert.equal(row.trait.name, name);
        assert.equal(
          adapter.avatarTraitLabel(zone, name, (key) => copy[key], true),
          name
        );
      }
    assert.equal(
      adapter.avatarTraitLabel('wings', 'Original purchased name', (key) => copy[key]),
      'Original purchased name'
    );
    assert.equal(
      adapter.avatarTraitLabel('skin', 'constructor', (key) => copy[key]),
      'constructor'
    );
  }
  const turkish = render(complete(), false, 'tr');
  assert.match(turkish.props.children[0].props.accessibilityLabel, /Kısa/);
  assert.match(turkish.props.children[0].props.accessibilityLabel, /Tişört/);
});

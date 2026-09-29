const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const mobile = path.resolve(__dirname, '..');
const inspectExpo = `
const { env } = require('@expo/cli/build/src/utils/env');
console.log(JSON.stringify({
  rawCI: process.env.CI ?? null,
  expoCI: env.CI,
  nodeMatches: process.env.NODE_BINARY === process.execPath,
  release: process.env.LILOVE_RELEASE_BUILD,
  apiOrigin: process.env.EXPO_PUBLIC_API_URL
}));
`;

for (const [input, normalized, expected] of [
  ['TRUE', 'true', true],
  ['FALSE', 'false', false],
  ['true', 'true', true],
  ['false', 'false', false],
  ['1', '1', true],
  [undefined, null, false],
]) {
  test(`Xcode shell handles CI=${input ?? 'unset'} with the installed Expo parser`, (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lilove-xcode-env-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.mkdirSync(path.join(directory, 'Pods'));
    fs.symlinkSync(path.join(mobile, 'ios/ci_scripts'), path.join(directory, 'ci_scripts'), 'dir');
    const environment = {
      ...process.env,
      PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`,
      CONFIGURATION: 'Release',
      PROJECT_DIR: directory,
      PODS_ROOT: path.join(directory, 'Pods'),
    };
    if (input === undefined) delete environment.CI;
    else environment.CI = input;
    const result = spawnSync(
      '/bin/bash',
      [
        '-e',
        '-c',
        '. "$1"; exec "$NODE_BINARY" -e "$2"',
        'xcode-env',
        path.join(mobile, 'ios/.xcode.env'),
        inspectExpo,
      ],
      { cwd: mobile, env: environment, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      rawCI: normalized,
      expoCI: expected,
      nodeMatches: true,
      release: '1',
      apiOrigin: 'https://lilove-api.onrender.com',
    });
  });
}

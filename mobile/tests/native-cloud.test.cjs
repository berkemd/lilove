const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { verifyNative } = require('../scripts/verify-native.cjs');

const root = path.resolve(__dirname, '..');

test('reviewed native project includes localized resources, capabilities and portable archive inputs', () => {
  assert.equal(verifyNative(root, { pods: false }).locales, 7);
});

test('fmt install hook patches once and rejects absent or unexpected dependency headers', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lilove-fmt-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const header = path.join(directory, 'fmt/include/fmt/base.h');
  fs.mkdirSync(path.dirname(header), { recursive: true });
  const podfile = fs.readFileSync(path.join(root, 'ios/Podfile'), 'utf8');
  const hook = podfile.match(/    # --- fmt × Xcode 26[\s\S]*?    # --- fmt yamasi sonu ---/u)[0];
  const ruby = `require 'ostruct'\nmodule Pod; module UI; def self.puts(*); end; end; end\ninstaller = OpenStruct.new(sandbox: OpenStruct.new(root: ARGV.fetch(0)))\n${hook}`;
  const run = () => spawnSync('ruby', ['-e', ruby, directory], { encoding: 'utf8' });
  const original =
    '#if !defined(__cpp_lib_is_constant_evaluated)\n#  define FMT_USE_CONSTEVAL 0\n#endif\n';
  fs.writeFileSync(header, original);
  assert.equal(run().status, 0);
  const patched = fs.readFileSync(header, 'utf8');
  assert.match(patched, /#define FMT_USE_CONSTEVAL 0/u);
  assert.equal(run().status, 0);
  assert.equal(fs.readFileSync(header, 'utf8'), patched);
  fs.writeFileSync(header, '// unexpected dependency version\n');
  assert.notEqual(run().status, 0);
  fs.unlinkSync(header);
  assert.notEqual(run().status, 0);
});

test('pod deployment hook raises legacy resource targets without lowering newer ones', () => {
  const { postInstall } = require('../plugins/withDeploymentTarget');
  const ruby = `require 'ostruct'
require 'json'
values = [nil, '9.0', '11.0', '15.1', '16.0']
configurations = values.map { |value| OpenStruct.new(build_settings: {'IPHONEOS_DEPLOYMENT_TARGET' => value}) }
installer = OpenStruct.new(pods_project: OpenStruct.new(targets: [OpenStruct.new(build_configurations: configurations)]))
podfile_properties = {}
${postInstall}
puts JSON.generate(configurations.map { |configuration| configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] })`;
  const result = spawnSync('ruby', ['-e', ruby], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ['15.1', '15.1', '15.1', '15.1', '16.0']);
});

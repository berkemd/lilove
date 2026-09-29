const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const xcode = require('xcode');
const plist = require('@expo/plist').default;

const unquote = (value) => String(value ?? '').replace(/^"|"$/g, '');

function verifyNative(mobileRoot = path.resolve(__dirname, '..'), { pods = true } = {}) {
  const ios = path.join(mobileRoot, 'ios');
  const read = (file) => fs.readFileSync(path.join(ios, file), 'utf8');
  const project = xcode.project(path.join(ios, 'LiLove.xcodeproj/project.pbxproj')).parseSync();
  const objects = project.hash.project.objects;
  const info = plist.parse(read('LiLove/Info.plist'));
  const entitlements = plist.parse(read('LiLove/LiLove.entitlements'));
  const locales = ['en', 'de', 'fr', 'es', 'it', 'ja', 'tr'];
  assert.deepEqual(info.CFBundleLocalizations, locales);
  assert.deepEqual(entitlements['com.apple.developer.applesignin'], ['Default']);
  assert.equal(entitlements['aps-environment'], 'development');
  assert.equal(info.CFBundleVersion, '$(CURRENT_PROJECT_VERSION)');
  assert.equal(info.CFBundleShortVersionString, '$(MARKETING_VERSION)');
  assert.equal(info.ITSAppUsesNonExemptEncryption, false);
  assert.equal(info.NSCameraUsageDescription, undefined);
  assert.equal(info.NSMicrophoneUsageDescription, undefined);
  const schemes = info.CFBundleURLTypes.flatMap((entry) => entry.CFBundleURLSchemes);
  assert(schemes.includes('lilove'));
  assert(schemes.includes('org.lilove.app'), 'Expo Google callback is unregistered');
  const releaseEnv = read('ci_scripts/release-env.sh');
  const googleClient = releaseEnv.match(/^export EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=(.+)$/mu)?.[1];
  assert(
    googleClient?.endsWith('.apps.googleusercontent.com'),
    'Cloud Google iOS client is missing'
  );
  const callback =
    'com.googleusercontent.apps.' + googleClient.replace('.apps.googleusercontent.com', '');
  assert(schemes.includes(callback), 'Cloud iOS OAuth client and native callback differ');
  const eas = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'eas.json'), 'utf8'));
  assert.equal(eas.build.production.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, googleClient);
  const webClient = releaseEnv.match(/^export EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=(.+)$/mu)?.[1];
  assert(webClient?.endsWith('.apps.googleusercontent.com'), 'Cloud Google Web client is missing');
  assert.notEqual(webClient, googleClient, 'Google Web and iOS require separate clients');
  assert.equal(eas.build.production.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, webClient);

  const targetEntry = Object.entries(objects.PBXNativeTarget).find(
    ([key, value]) => !key.endsWith('_comment') && unquote(value.name) === 'LiLove'
  );
  assert(targetEntry, 'LiLove application target is missing');
  const [targetId, target] = targetEntry;
  const buildConfigurations = objects.XCConfigurationList[target.buildConfigurationList];
  for (const reference of buildConfigurations.buildConfigurations) {
    const settings = objects.XCBuildConfiguration[reference.value].buildSettings;
    assert.equal(unquote(settings.PRODUCT_BUNDLE_IDENTIFIER), 'org.lilove.app');
    assert.equal(unquote(settings.CURRENT_PROJECT_VERSION), '131');
    assert.equal(unquote(settings.MARKETING_VERSION), '1.2');
    assert.equal(unquote(settings.CODE_SIGN_ENTITLEMENTS), 'LiLove/LiLove.entitlements');
    assert.equal(unquote(settings.DEVELOPMENT_TEAM), '87U9ZK37M2');
    assert.equal(unquote(settings.CODE_SIGN_STYLE), 'Automatic');
  }

  // Resolve the actual PBX group hierarchy, not just matching filenames in text.
  const filePaths = new Map();
  const visit = (id, directory) => {
    const group = objects.PBXGroup[id];
    if (group) {
      const next = path.resolve(directory, unquote(group.path));
      for (const child of group.children) visit(child.value, next);
    } else if (objects.PBXFileReference[id]) {
      filePaths.set(id, path.resolve(directory, unquote(objects.PBXFileReference[id].path)));
    }
  };
  visit(project.getFirstProject().firstProject.mainGroup, ios);
  const resources = target.buildPhases
    .map((phase) => objects.PBXResourcesBuildPhase[phase.value])
    .filter(Boolean)
    .flatMap((phase) => phase.files)
    .map((file) => {
      const buildFile = objects.PBXBuildFile[file.value];
      assert(buildFile, `Dangling resource build reference: ${file.value}`);
      return filePaths.get(buildFile.fileRef);
    });
  for (const locale of locales) {
    const strings = path.join(ios, 'LiLove', 'Supporting', `${locale}.lproj`, 'InfoPlist.strings');
    assert.equal(
      resources.filter((file) => file === strings).length,
      1,
      `${locale} PBX resource missing or duplicated`
    );
    assert.match(fs.readFileSync(strings, 'utf8'), /NSPhotoLibraryUsageDescription = ".+";/u);
  }
  const scheme = read('LiLove.xcodeproj/xcshareddata/xcschemes/LiLove.xcscheme');
  assert.match(scheme, /<ArchiveAction\s+buildConfiguration="Release"/u);
  assert.match(scheme, new RegExp(`BlueprintIdentifier="${targetId}"`));
  assert.doesNotMatch(
    scheme,
    /LiLoveTests/u,
    'Generated scheme must not reference a missing test target'
  );
  assert.match(read('LiLove.xcworkspace/contents.xcworkspacedata'), /group:LiLove.xcodeproj/u);
  for (const file of ['Podfile.lock', 'LiLove.xcodeproj/project.pbxproj']) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /\/Users\/|Desktop\/|lilove-source|\.\.\/\.\.\/\.\.\//u,
      `${file} contains a nonportable source path`
    );
  }
  assert.match(read('Podfile.lock'), /  - ExpoIap \(2\.8\.5\)/u);
  assert.match(read('Podfile.lock'), /  - fmt \(11\.0\.2\)/u);
  if (pods) {
    assert.equal(
      read('Pods/Manifest.lock'),
      read('Podfile.lock'),
      'Pods differ from the committed lock'
    );
    const fmt = read('Pods/fmt/include/fmt/base.h');
    assert.match(fmt, /#define FMT_EXTERNAL_USE_CONSTEVAL 1\n#define FMT_USE_CONSTEVAL 0/u);
  }
  return {
    bundleIdentifier: 'org.lilove.app',
    version: '1.2',
    sourceBuild: 131,
    locales: locales.length,
    podsVerified: pods,
  };
}

if (require.main === module) console.log(JSON.stringify(verifyNative(), null, 2));
module.exports = { verifyNative };

#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NODE_VERSION="$(cat "$MOBILE_ROOT/.node-version")"
BUNDLER_VERSION="$(awk '/BUNDLED WITH/{getline; gsub(/ /, ""); print}' "$MOBILE_ROOT/Gemfile.lock")"
TOOLS_DIR="$MOBILE_ROOT/vendor/cloud-tools"

case "$(uname -m)" in
arm64) NODE_ARCH=arm64 ;;
x86_64) NODE_ARCH=x64 ;;
*)
  echo 'Unsupported Cloud host architecture' >&2
  exit 1
  ;;
esac
NODE_ARCHIVE="node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz"
NODE_ROOT="$TOOLS_DIR/node-v${NODE_VERSION}-darwin-${NODE_ARCH}"
mkdir -p "$TOOLS_DIR"
if [ ! -x "$NODE_ROOT/bin/node" ]; then
  curl --fail --location --retry 3 --proto '=https' --tlsv1.2 \
    "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}" -o "$TOOLS_DIR/$NODE_ARCHIVE"
  (cd "$TOOLS_DIR" && grep "  $NODE_ARCHIVE\$" "$SCRIPT_DIR/node-checksums.txt" | shasum -a 256 -c -)
  tar -xzf "$TOOLS_DIR/$NODE_ARCHIVE" -C "$TOOLS_DIR"
fi
export PATH="$NODE_ROOT/bin:$PATH"
[ "$(node --version)" = "v$NODE_VERSION" ]

# Xcode's system Ruby is too old for the locked CocoaPods dependencies.
if [ ! -x "$(brew --prefix ruby@3.3)/bin/ruby" ]; then
  HOMEBREW_NO_AUTO_UPDATE=1 brew install ruby@3.3
fi
export PATH="$(brew --prefix ruby@3.3)/bin:$PATH"
ruby -e 'abort "Ruby 3.3 is required" unless RUBY_VERSION.start_with?("3.3.")'
export GEM_HOME="$TOOLS_DIR/gems"
export GEM_PATH="$GEM_HOME:$(ruby -e 'puts Gem.default_dir')"
export PATH="$GEM_HOME/bin:$PATH"
gem install bundler --version "$BUNDLER_VERSION" --no-document

cd "$MOBILE_ROOT"
export CI=1 EXPO_NO_TELEMETRY=1 COCOAPODS_DISABLE_STATS=true
source "$SCRIPT_DIR/release-env.sh"
npm ci --no-audit --no-fund
npm test
./node_modules/.bin/tsc --noEmit
export BUNDLE_GEMFILE="$MOBILE_ROOT/Gemfile"
export BUNDLE_PATH="$MOBILE_ROOT/vendor/bundle"
export BUNDLE_FROZEN=true
bundle "_${BUNDLER_VERSION}_" install --jobs 4 --retry 3

# Xcode starts build phases in a new shell; preserve only the public runtime path.
printf 'export NODE_BINARY="%s"\n' "$(command -v node)" >"$MOBILE_ROOT/ios/.xcode.env.local"
cd ios
bundle "_${BUNDLER_VERSION}_" exec pod install --deployment
cmp Podfile.lock Pods/Manifest.lock
node ../scripts/verify-native.cjs
# Cloud builds this reviewed native project. Prebuild is deliberately not run here.

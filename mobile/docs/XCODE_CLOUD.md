# LiLove Xcode Cloud

Distribution uses stable Xcode Cloud. Local Xcode builds are QA only.

## Reviewed inputs

- Workspace: `mobile/ios/LiLove.xcworkspace`; shared scheme: `LiLove`.
- Archive configuration: `Release`; bundle: `org.lilove.app`; team: `87U9ZK37M2`.
- Marketing version: 1.2; source build: 131. Set the Cloud product's next build to at least 131, above the last uploaded build 130. `CFBundleVersion` uses `CURRENT_PROJECT_VERSION`, so Cloud can supply subsequent build numbers.
- Node 24.19.0 (official archive checksums committed), Bundler 2.6.9, CocoaPods 1.17.0. Bootstrap uses Homebrew Ruby 3.3; Gemfile.lock includes arm64, x64 and Ruby platforms.
- Expo 52.0.47, React Native 0.76.9 and expo-iap 2.8.5 remain npm-locked.
- The initial native project was generated once with the locked Expo CLI and official `expo-template-bare-minimum@52.0.79`. Cloud does not run prebuild.

## Cloud setup

Connect the reviewed Git branch and select the workspace and shared scheme above. Choose a **stable** Xcode and its supported stable macOS, automatic signing with the stated team, an Archive action, and the intended TestFlight post-action. The product/workflow must be created through Xcode's initial Cloud onboarding if it does not exist yet.

Xcode discovers `ios/ci_scripts/ci_post_clone.sh` next to the project. It installs Node with checksum verification, frozen npm and Ruby dependencies, runs tests and TypeScript checks, then runs `bundle exec pod install --deployment` and verifies the native contract. Commit Podfile.lock and Gemfile.lock together with native source changes. Keep Pods, build artifacts, local Xcode environment, user settings and secrets untracked.

`ios/ci_scripts/release-env.sh` contains public release configuration and is loaded both by post-clone and Xcode Release script phases. It selects the verified API origin and Firebase iOS OAuth client. Never add service credentials. The native URL schemes include the app callback and that client's reversed identifier. Check these together whenever the Google client changes.

## Verification boundaries

The native verifier checks all seven actual PBX resource paths, Apple Sign-In/APNs declarations, signing team, shared Release scheme, build metadata, portable dependency paths and the installed fmt compatibility patch. Its test also proves missing/unexpected fmt headers abort installation.

A successful local simulator build does not establish Cloud signing or successful App Store submission. Stable Cloud archive, signed Apple/Google sign-in, StoreKit purchase/restore, provisioning with Apple Sign-In/APNs and the rejected-version review response remain release gates. APNs is declared as development in source; the distribution entitlement must be checked in the Cloud-signed archive/profile.

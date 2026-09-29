# Profile-only Firestore access — task 0087

The root `firestore.rules` file is a candidate policy, not evidence of deployment.
It permits a signed-in account to get only `users/{its Firebase UID}`. Own missing
document reads are allowed for the app's create-if-missing transaction. Listing
users, deleting profiles, subcollections and all other client collections are
denied. The canonical API/PostgreSQL routes have their own authorization and are
not granted access by these rules.

Creation requires exactly the current 13 profile fields. UID must match the
document path and authenticated UID; email must match the ID-token email claim
(or be empty when the claim is absent). Creation accepts only the existing free
defaults, including 100 coins, zero stats/level 1, neutral mood, false onboarding,
and light/en/notifications-on settings. Creation/update timestamps must be
server timestamps equal to `request.time`. These client defaults are not a
trusted financial ledger or proof of a paid entitlement.

An owner may subsequently change only display name, photo URL, supported mood,
onboarding boolean, settings, and login/update timestamps. Name is at most 100
characters. Photo is null or an HTTPS URL / `/uploads/profile-pictures/…` path of
at most 2048 characters. Settings have exactly theme (`light`/`dark`), boolean
notifications and one of the seven current language codes. Unknown fields, UID,
email, balance, premium/tier, stats and creation time cannot be changed or removed
by a client. A changed `lastLoginAt` must also equal `request.time`.

Only changed mutable fields are revalidated during updates: login timestamps do
not force an old or server-written profile back to initial balance, tier, stats,
settings or name defaults. Invalid legacy values are not silently repaired. A
user editing legacy settings must replace them with the supported complete map.

## Explicit emulator test

Dependencies are installed separately under the task's QA tooling directory;
canonical package manifests and lockfiles are unchanged. Set `JAVA_HOME` to the
task's JRE 21 and use a compatible Node runtime. From the repository root:

```sh
export LILOVE_RULES_DEPS_DIR=/absolute/path/to/task0087-production-auth/emulator-tools
npm install --prefix "$LILOVE_RULES_DEPS_DIR" --no-audit --no-fund \
  firebase-tools@15.32.0 firebase@12.19.0 @firebase/rules-unit-testing@5.0.2
export FIREBASE_EMULATORS_PATH="$LILOVE_RULES_DEPS_DIR/emulators"
export XDG_CONFIG_HOME="$LILOVE_RULES_DEPS_DIR/configstore"
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8187
export NO_UPDATE_NOTIFIER=1 CI=1
node "$LILOVE_RULES_DEPS_DIR/node_modules/firebase-tools/lib/bin/firebase.js" \
  emulators:exec --only firestore --project demo-lilove-0087 \
  --config firebase.firestore-qa.json \
  'node --test mobile/tests/firestore-rules.integration.cjs'
```

If the coordinator has already started that emulator, run only the final Node
test command with the same environment. The harness rejects missing/non-loopback
endpoints and uses a hard-coded `demo-` project; it does not use production
credentials. Its `.integration.cjs` name keeps the explicit emulator gate out of
the ordinary `*.test.cjs` suite. It loads the real application profile adapter
with mocked Auth/native configuration and the real Firestore emulator SDK.

The separate QA-only expired-policy fixture reproduces the previous date-limited
policy denying authenticated own get/create. Run its `expired-baseline.cjs`
before this integration suite; this suite reloads the candidate rules afterward.
Do not use either fixture or the QA config as an implicit deployment command.

## Verification boundaries

The QA toolchain uses Firebase 12 / rules-unit-testing 5 while the application
uses Firebase 11. The suite checks actual adapter payloads/transaction callbacks
and server rule decisions; it does not certify the installed native app SDK,
real provider identity, email delivery, production rules or existing user data.
Production deployment/readback requires a separate coordinated action.

At this checkpoint the real local Firestore emulator 1.22.0 compiled the rules
and passed all 15 integration tests. The expired-policy baseline denied both
authenticated own get and create. Expected permission-denied logs come from the
negative assertions. JSON, CJS and Markdown use Prettier; `.rules` uses manual
two-space formatting and the real emulator compiler (no invented formatter).

The live legacy web/Firestore goals, chat and connection flows have not been
audited here. This policy intentionally grants none of those accesses; enabling
them requires a separate ownership/schema review. Existing missing OAuth profile
creation still uses historical defaults, so authoritative balance/history repair
and abuse control remain production gates. A deny-delete rule prevents ordinary
clients from deleting/recreating a profile to reset its starting balance.

Reference: [Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)
and [rules unit testing](https://firebase.google.com/docs/rules/unit-tests).

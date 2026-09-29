# Auth session safeguards — task 0083

This checkpoint covers the current JavaScript session in `src/services/tokenManager.ts`, `initializeAuth` in `src/store/authStore.ts`, and `subscribeToAuthState` in `src/lib/firebase.ts`.

## Implemented behavior

- Clearing credentials immediately clears the in-memory access and refresh tokens. Loaded-state and revision checks prevent a delayed SecureStore read from restoring a superseded credential in the same process, including when native deletion rejects.
- SecureStore mutations run in intent order. An earlier pending write finishes before a later logout deletion, so that write cannot subsequently restore the deleted token. Storage failures leave the current in-memory decision intact; they do not prove that the persisted value changed.
- Token listeners are isolated from one another's exceptions. A revision check stops delivery of an old token when a listener triggers logout or selects a new token during notification.
- Each auth callback has a revision guard. Account changes clear the previous profile and detach its subscription; late token and profile responses cannot replace the selected account. Cleanup invalidates pending callbacks and detaches subscriptions. Token acquisition failure does not open an authenticated application. Refreshing the same account retains its current profile while replacing the token and profile subscription.
- Firebase observation uses `onIdTokenChanged`, which includes sign-in, sign-out, and token refresh events. **Expiration alone does not automatically fire this observer.** Firebase documents `getIdToken()` for refreshing the token. This subscription is not an expiration-on-resume implementation. [Official Firebase JavaScript reference](https://firebase.google.com/docs/reference/js/auth#onidtokenchanged), checked 2026-09-29.

## Verification and limits

At the task 0083 checkpoint, the coordinator recorded **14/14 auth-session tests** and **91/91 tests in the full mobile suite** passing. Run from `mobile/`:

```sh
node --test tests/auth-session.test.cjs
npm test
```

The auth tests load the actual TypeScript modules with mocked SecureStore, Firebase callbacks, and store dependencies. They exercise delayed reads and writes, failed deletion, listener reentrancy, account switching, stale profile responses, cleanup, acquisition failure, refresh, and the existing sample-data tour. They do not establish native SDK or remote-service behavior. This documentation-only checkpoint does not represent a new test run.

The following remain unverified:

- Credential behavior across a process restart after native SecureStore deletion fails. The in-session loaded-state guard does not survive a restart and does not prove disk erasure.
- Firebase native persistence, signed-in cold-start restoration, background token expiration, and refresh when returning to the foreground.
- Real Apple/Google SSO, provider cancellation and failure behavior, and end-to-end authenticated service access on a device.

## Explicit React Native persistence — task 0084

`src/lib/firebaseAuth.ts` now initializes native Auth with the existing
AsyncStorage dependency through Firebase's public `getReactNativePersistence`
adapter. The installed Firebase 11.10.0 / Auth 1.10.8 RN entry documents and
exports this API. Its shared type entry omits the platform-only function, so a
local type describes that verified export and a runtime check rejects a missing
RN implementation. Web continues to use Firebase's default `getAuth` behavior.

Only `auth/already-initialized` reuses the existing Auth instance, supporting
module re-evaluation without creating a second instance. Other errors propagate.
An instance already created with memory persistence is not silently migrated by
Fast Refresh; validation must start with a fresh application process.

This uses Firebase's AsyncStorage persistence, not encrypted SecureStore. The
separate API-token cache still uses SecureStore. No credential, account or provider
configuration is added by this change.

The new tests cover native adapter configuration, web behavior, error propagation
and missing exports. An additional test loads the installed RN SDK with an
in-memory AsyncStorage substitute, observes its persisted-user lookup, and
verifies instance reuse after helper re-evaluation with no network requests.
It does not sign in or simulate a successful native restart. The native
persistence, signed restart, background expiration and real SSO gates above
remain open until device validation.

These safeguards are not a complete authentication or release certification.

## Profile recovery — task 0086

Authentication and profile loading now have separate state. After a valid ID token
is obtained, `profileStatus` records `loading`, `ready` or `error`; it does not
change a verified identity into a failed sign-in just because a profile read
failed. The Firebase snapshot adapter forwards its error callback. A synchronous
subscription failure, missing document or no first response within 15 seconds
opens explicit profile recovery instead of an indefinite application spinner.
The profile listener does not create an account profile, balance or entitlement
for a missing document.

The recovery screen has Retry and Log Out. Logout remains available while a
profile attempt is pending. Retry replaces only that account's profile listener;
it does not create another auth listener. Account revision, profile attempt and
disposal checks reject stale success, error and timer callbacks. Timers are cleared
on response or cancellation. A timeout does not cancel network work: the current
attempt's late successful snapshot may recover. A missing document's live listener
may similarly receive the document created by signup later.

A same-account token refresh retains a previously ready profile and mounted main
screen while its listener is renewed. A failed refresh invalidates any concurrent
profile retry. The sample-data tour remains independent of profile recovery.
Profile recovery never writes or deletes user documents and preserves the fields
of successful snapshots.

Logout immediately invalidates profile work and clears the local session/token
before waiting for Firebase sign-out. Late callbacks cannot reopen that session.
A failed SDK sign-out is reported locally and does not certify that Firebase's
persisted state was removed; explicit sign-in can start a new local auth attempt.
The existing signed-device/restart verification boundary remains open.

The original source failed all nine initial profile regression cases; that log is
preserved in the portfolio audit. Additional tests execute the actual snapshot
adapter, recovery component and AppContent routing, alongside the auth store with
controlled callbacks/timers. They cover permission errors, synchronous throws,
missing/late documents, timeout, retry, account switch, token rotation, disposal,
logout, and field preservation. These are local behavioral tests, not real
Firebase-account, network or signed-device validation.

## Profile creation and verification delivery — task 0087

Email signup now persists its profile before updating the Auth display name or
requesting the verification email. Firestore creation uses a transaction: an
existing document, including one that wins a concurrent write, retains all fields
except the existing `lastLoginAt`/`updatedAt` timestamp refresh. Profile write
failures still reject before either follow-up step begins.

Once the profile is saved, both follow-up steps are attempted independently. If
either fails, `auth/account-setup-incomplete` identifies the failed step(s) as
`account-name` and/or `verification-email`. RegisterScreen shows a localized
"Account created" notice with the appropriate explanation(s). It does not claim
the address was verified or email delivery succeeded, and it does not promise a
resend control that is absent. The asynchronous handler retains this distinction
if auth observation has already changed the current route.

Email sign-in now uses the same atomic create-if-missing path as Apple/Google,
after authentication succeeds. If signup creates the Auth account but its profile
write fails, a later email sign-in can retry the missing profile. A failed profile
write still rejects; another sign-in can retry. Existing and concurrently created
documents keep their data, with only the login timestamps updated. Failed
authentication never starts a profile transaction. Sign-in does not resend a
verification email or repeat signup's display-name update.

The Apple/Google path remains retryable even when Firebase no longer marks the
account new. Task 0086's recovery Retry only reads; it never fabricates an
in-memory profile. When a missing profile needs creation, signing out and signing
in again invokes the persisted creation path.

The existing persisted creation defaults, including the 100-coin starting value,
are unchanged. Their use for any old missing profile remains a production
gate: they are not verified history, server balance or paid rights. This change
does not implement an authoritative financial/data-repair service. Existing
profile data is never replaced by those defaults.

The regression tests load the real Firebase adapter and RegisterScreen with
controlled SDK/store/UI boundaries. A transaction retry is simulated to check
that the callback does not replace an existing document. These checks do not
prove deployed Firestore rules, a real transaction race, email delivery, account
creation, or signed native navigation. Those remain integration gates.

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

These safeguards are not a complete authentication or release certification.

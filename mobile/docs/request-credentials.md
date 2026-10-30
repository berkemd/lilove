# Request credentials — task 0520/96

Ordinary requests through `lib/api` ask the active auth session for an SDK
credential before their first HTTP request. Firebase `getIdToken()` can refresh
an expired credential without forcing a network refresh for every request.
Expiration alone does not trigger `onIdTokenChanged`.

The provider belongs to the initialized auth session. Account changes, logout,
session disposal and a 15-second credential deadline prevent a late result from
starting HTTP. A refresh error does not fall back to an old cached credential.
The request does not rewrite the credential cache or replay a write.

Explicitly pinned request credentials and ordinary `tokenManager.getToken()`
calls retain their previous behavior. In particular, the existing IAP session
comparison and restore verification policy are unchanged. The sample-data tour
continues to use its offline response path without requesting a credential.

The regression harness executes the actual auth store, token manager and API
modules with controlled SDK, storage and HTTP boundaries. It does not prove real
Apple/Google sign-in, device restart, deployed server access or an actual StoreKit
transaction. Those signed-device acceptance gates remain open.

References:

- [Firebase ID token observer](https://firebase.google.com/docs/reference/js/auth#onidtokenchanged)
- [Firebase User.getIdToken](https://firebase.google.com/docs/reference/js/auth.user#getidtoken)

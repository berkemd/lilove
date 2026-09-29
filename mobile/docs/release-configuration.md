# API origin for native builds

Set `EXPO_PUBLIC_API_URL` to the intended API's HTTPS origin when evaluating Expo configuration. An origin contains only a scheme, host and optional port. One trailing slash is accepted and removed; host casing and the default HTTPS port are normalized. Paths, query strings, fragments, credentials, whitespace and malformed addresses are rejected in every build mode. An explicitly empty value is invalid.

Release validation is enabled by either exact value:

- `LILOVE_RELEASE_BUILD=1`, for a release pipeline such as Xcode Cloud.
- `EAS_BUILD_PROFILE=production`, for the production EAS profile.

`CI=1` alone does not select release mode. Release configuration requires an explicit API origin and rejects the known protected preview host `lilove-qa.onrender.com`, including host-case and trailing-dot variants. It also rejects the currently inactive `lilove.org` domain and all its subdomains, regardless of host casing, trailing dots or port. Never put a preview access token, credentials or any private key in this public variable or Expo `extra`.

A custom domain purchase is not required. A verified hosting provider's HTTPS domain can be used once its TLS, readiness, authentication and data flows have been checked. The domain restriction above is an explicit current release gate; acquiring or activating a domain does not silently remove it.

When no override exists in nonrelease mode, the historical `https://lilove.org` origin remains the fallback. This fallback is configuration only; it is not evidence that the host is reachable or ready. Explicitly invalid values never fall back silently.

`app.config.js` stores the validated, slash-free result in `extra.apiUrl`. The runtime client prefers that canonical Expo value over the raw public environment variable. Its existing environment/default fallback remains available only when Expo configuration has no origin.

Before a release, separately verify the selected real host's TLS, `/healthz`, `/readyz`, authentication and saved-data flows. Syntax validation does not prove host availability. EAS profile variables do not automatically become Xcode Cloud variables: a Cloud release must set `LILOVE_RELEASE_BUILD=1` and the intended `EXPO_PUBLIC_API_URL` before Expo config evaluation. This change does not generate an iOS project, configure signing or create a Cloud workflow.

Run the offline contract checks from `mobile`:

```sh
node --test tests/api-origin.test.cjs
```

The tests use fixture addresses and an isolated child environment with the installed Expo config evaluator. They verify normalized `extra.apiUrl`, retained Firebase/Google configuration structure, sanitized errors and the URL requested by the actual API client. They do not load `.env` files, call an identity provider or print the full public config.

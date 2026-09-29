# New subscription availability — task 0084

This candidate does not open new subscription sales. Its paid benefits and IAP
release gates have not been approved. `src/lib/subscriptionAvailability.ts`
returns false explicitly; AI capabilities, credentials, product listings and
existing entitlements cannot enable it. Reopening requires a reviewed source and
product release decision, including real paid value and IAP verification.

`PremiumScreen` shows the existing localized subscription-unavailable/help copy,
without loading offerings or displaying purchase controls. The former claims
about AI coaching, unlimited goals/habits, advanced analytics, premium challenges,
priority support and custom themes are removed from both screen states. Verified
Pro/Team status, subscription management, restore and status retry remain. An
unknown or failed entitlement read is not called Free. The screen's closure does
not change entitlement normalization or access in other screens.

The IAP service checks closure after the existing demo-account guard and before
account preflight, timers or `requestPurchase`. It checks both subscription call
type and known subscription SKU, so passing a subscription SKU through the coin
wrapper cannot bypass closure. `SUBSCRIPTIONS_UNAVAILABLE` means no purchase was
started; the UI does not mark it as an uncertain receipt or payment.

Restore and existing transaction delivery continue through their existing
verification paths. Verification still precedes `finishTransaction`, and failed
verification leaves a transaction unfinished for replay. Coin purchases are
unchanged by this scoped guard; this does not certify their release readiness.

Tests execute the actual screen, policy and IAP modules with StoreKit, account and
network boundaries replaced by controlled fixtures. They cover closed new sales,
the wrong-wrapper case, visible restore before any offerings resolve, free/error/
paid status, restore recovery, existing transaction replay and pre-purchase error
classification. Existing purchase lifecycle regressions use an explicitly
test-only open policy; separate tests use the real closed policy. There is no
production flag that activates that test override.

This protects users from this candidate's new subscription sales. It does not
create paid value, approve products, disable App Store renewal of any existing
subscription, or prove real StoreKit purchase/restore behavior.

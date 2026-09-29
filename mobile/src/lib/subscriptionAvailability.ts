export const SUBSCRIPTIONS_UNAVAILABLE = 'SUBSCRIPTIONS_UNAVAILABLE';

// This candidate has no release-approved paid benefit. StoreKit products,
// AI availability, credentials and existing entitlements cannot open new sales.
// Reopening requires a reviewed product/IAP release change, not a runtime flag.
export function areNewSubscriptionsAvailable(): boolean {
  return false;
}

export function assertNewSubscriptionAvailable(): void {
  if (!areNewSubscriptionsAvailable()) {
    throw Object.assign(new Error('New subscriptions are currently unavailable'), {
      code: SUBSCRIPTIONS_UNAVAILABLE,
    });
  }
}

export const COINS_UNAVAILABLE = 'COINS_UNAVAILABLE';

// This candidate has no release-approved paid benefit. StoreKit products,
// AI availability, credentials and existing entitlements cannot open new sales.
// Reopening requires a reviewed product/IAP release change, not a runtime flag.
export function areNewCoinPurchasesAvailable(): boolean {
  return false;
}

export function assertNewCoinPurchaseAvailable(): void {
  if (!areNewCoinPurchasesAvailable()) {
    throw Object.assign(new Error('New coin purchases are currently unavailable'), {
      code: COINS_UNAVAILABLE,
    });
  }
}

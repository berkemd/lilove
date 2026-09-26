// =====================================================================
//  DEMO TOUR: THE PURCHASE STOPS BEFORE IT STARTS
//
//  App Review, 15 Sep 2026 (2.1(a)): "We were unable to use the core
//  feature, subscription, because we received an error message."
//
//  The easiest path for a reviewer is "Look around without an account".
//  From there, Subscribe used to open Apple's payment sheet and take the
//  (sandbox) payment. The verification call to the server was then cut
//  by the demo client with "Purchases need an account.", so the person
//  paid and got an error. The purchase was never finished either.
//
//  The subscription is tied to the account because the coach runs on
//  the server. So in the demo tour we explain that BEFORE any payment
//  and offer account creation with one tap.
// =====================================================================
import { Alert } from 'react-native';
import { t } from '../i18n';
import { useAuthStore } from '../store/authStore';

/** Returns true when the purchase must not start; the user has already been told why and what to do. */
export function purchaseBlockedInDemo(): boolean {
  if (!useAuthStore.getState().isDemo) return false;
  Alert.alert(t('purchase_needs_account_title'), t('purchase_needs_account_body'), [
    { text: t('cancel'), style: 'cancel' },
    {
      text: t('create_account'),
      // Leaving the demo returns to the sign-in screen, where account
      // creation and Sign in with Apple both are.
      onPress: () => {
        void useAuthStore.getState().logout();
      },
    },
  ]);
  return true;
}

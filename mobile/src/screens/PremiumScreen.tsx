import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import {
  loadSubscriptionProducts,
  buySubscription,
  restore,
  type StoreProduct,
} from '../services/iap';
import { periodOf, tierOf } from '../config/products';
import { useSubscription } from '../hooks/useSubscription';
import { t } from '../i18n';
import { purchaseBlockedInDemo } from '../lib/accountGate';
import { useThemedStyles, useTheme } from '../theme/ThemeProvider';
import {
  areNewSubscriptionsAvailable,
  SUBSCRIPTIONS_UNAVAILABLE,
} from '../lib/subscriptionAvailability';

export default function PremiumScreen({ navigation }: any) {
  const styles = useThemedStyles(baseStyles);
  const { color: themeColor } = useTheme();

  const { isDemo } = useAuthStore();
  const subscription = useSubscription();
  const newSubscriptionsAvailable = areNewSubscriptionsAvailable();
  const [packages, setPackages] = useState<StoreProduct[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<StoreProduct | null>(null);
  const [isLoading, setIsLoading] = useState(newSubscriptionsAvailable);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseNeedsCheck, setPurchaseNeedsCheck] = useState(false);
  const [restoreNeedsRetry, setRestoreNeedsRetry] = useState(false);
  const restoreInFlight = useRef(false);
  const isPremium =
    subscription.status === 'verified' && subscription.subscription?.isPremium === true;
  const isFree =
    subscription.status === 'verified' && subscription.subscription?.isPremium === false;
  const purchaseDisabled =
    !newSubscriptionsAvailable || isPurchasing || purchaseNeedsCheck || (!isDemo && !isFree);

  useEffect(() => {
    setPurchaseNeedsCheck(false);
    setRestoreNeedsRetry(false);
  }, [subscription.accountId]);

  useEffect(() => {
    if (newSubscriptionsAvailable) loadOfferings();
  }, [newSubscriptionsAvailable]);

  const loadOfferings = async () => {
    try {
      setIsLoading(true);
      // Fiyatlar MAĞAZADAN geliyor; bu dosyada tek bir sabit fiyat yok.
      const urunler = await loadSubscriptionProducts();
      setPackages(urunler);
      // Varsayılan seçim yıllık: kullanıcıya en düşük aylık maliyeti
      // sunan plan odur ve seçimi kullanıcı her zaman değiştirebilir.
      const yillik = urunler.find((u) => periodOf(u.id) === 'yearly');
      setSelectedPackage(yillik || urunler[0] || null);
    } catch (error) {
      // Sessiz düşmüyoruz ama uyarı da atmıyoruz: ekran zaten
      // "Subscription Not Available" + Retry gösteriyor.
      setPackages([]);
      setSelectedPackage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    const status = await subscription.refresh(true);
    if (status) setPurchaseNeedsCheck(false);
  };

  const handlePurchase = async () => {
    if (purchaseBlockedInDemo()) return;
    if (!newSubscriptionsAvailable) return;
    if (purchaseDisabled) return;
    if (!selectedPackage) {
      Alert.alert(t('please_select_a_subscription_plan'));
      return;
    }

    try {
      setIsPurchasing(true);
      const result = await subscription.confirm(() => buySubscription(selectedPackage.id));
      if (result === 'account-changed') return;
      if (result !== 'active') {
        setPurchaseNeedsCheck(true);
        Alert.alert(t('subscription_unverified'), t('subscription_verification_pending'));
        return;
      }
      Alert.alert(t('subscription'), t('subscription_active_confirmed'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const kod = String(error?.code ?? '');
      if (kod === SUBSCRIPTIONS_UNAVAILABLE) {
        // No StoreKit request was started; this is not an uncertain payment.
        Alert.alert(
          t('subscription_not_available'),
          t('in_app_purchases_are_being_configured_please')
        );
        return;
      }
      const iptal =
        kod.includes('USER_CANCELLED') ||
        kod.includes('E_USER_CANCELLED') ||
        /cancel/i.test(String(error?.message ?? ''));
      if (!iptal) {
        // A failed receipt/status check does not prove Apple declined a charge.
        setPurchaseNeedsCheck(true);
        Alert.alert(t('subscription_unverified'), t('subscription_unavailable'));
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // GERİ YÜKLEME GERÇEKTEN GERİ YÜKLER: cihazdaki her abonelik işlemi
  // sunucuya yeniden doğrulatılır, sonra yetki sunucudan okunur.
  const handleRestore = async () => {
    if (restoreInFlight.current) return;
    if (purchaseBlockedInDemo()) return;
    restoreInFlight.current = true;
    try {
      setIsPurchasing(true);
      const result = await subscription.confirm(restore);
      if (result === 'account-changed') return;
      if (result === 'active') {
        setPurchaseNeedsCheck(false);
        setRestoreNeedsRetry(false);
        Alert.alert(t('subscription'), t('subscription_active_confirmed'));
      } else if (result === 'inactive') {
        setRestoreNeedsRetry(false);
        Alert.alert(t('no_subscription_found'), t('no_active_subscription_found_to_restore'));
      } else {
        setRestoreNeedsRetry(true);
        Alert.alert(t('subscription_unverified'), t('subscription_unavailable'));
      }
    } catch (error) {
      setRestoreNeedsRetry(true);
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'RESTORE_INCOMPLETE' &&
        'stage' in error &&
        error.stage === 'verification'
      ) {
        Alert.alert(t('subscription_unverified'), t('subscription_unavailable'));
      } else {
        Alert.alert(t('restore_failed'), t('failed_to_restore_purchases_please_try_again'));
      }
    } finally {
      restoreInFlight.current = false;
      setIsPurchasing(false);
    }
  };

  // FİYAT MAĞAZANIN BİÇİMLENDİRDİĞİ HÂLİYLE GÖSTERİLİR.
  // Kendimiz para birimi ya da ayraç seçmiyoruz: 175 bölgede farklı.
  const formatPrice = (pkg: StoreProduct) =>
    `${pkg.displayPrice}${periodOf(pkg.id) === 'yearly' ? t('per_year') : t('per_month')}`;

  const planName = (pkg: StoreProduct) => {
    const katman = tierOf(pkg.id) === 'team' ? 'Team' : 'Pro';
    const donem = periodOf(pkg.id) === 'yearly' ? t('annual') : t('monthly');
    return `${katman} ${donem}`;
  };

  const availabilityNotice = !newSubscriptionsAvailable ? (
    <View style={styles.noPackagesContainer} accessibilityLiveRegion="polite">
      {!isPremium && <Text style={styles.noPackagesTitle}>{t('subscription_not_available')}</Text>}
      <Text style={styles.noPackagesText}>{t('in_app_purchases_are_being_configured_please')}</Text>
    </View>
  ) : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          >
            <Ionicons name="close" size={24} color={themeColor('#1F2937', 'text')} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor('#8B5CF6', 'text')} />
          <Text style={styles.loadingText}>{t('loading_subscription_options')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Mağaza ürünleri gelmediyse ekran bunu SÖYLER ve tekrar dener.
  const showNoPackagesMessage = packages.length === 0;

  if (isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={themeColor('#1F2937', 'text')} />
            </TouchableOpacity>
          </View>

          <View style={styles.premiumActiveContainer}>
            <View style={styles.crownIcon}>
              <Ionicons name="trophy" size={48} color={themeColor('#8B5CF6', 'text')} />
            </View>
            <Text style={styles.premiumActiveTitle}>
              {subscription.subscription?.subscriptionTier === 'team' ? 'Team' : 'Pro'}
            </Text>
            <Text style={styles.premiumActiveSubtitle}>{t('subscription_active_confirmed')}</Text>

            {availabilityNotice}

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() =>
                Alert.alert(
                  t('manage_subscription'),
                  t('please_go_to_settings_subscriptions_on_your')
                )
              }
            >
              <Text style={styles.manageButtonText}>{t('manage_subscription')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isPurchasing}
            >
              <Text style={styles.restoreButtonText}>
                {restoreNeedsRetry ? t('retry') : t('restore_purchases')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={themeColor('#1F2937', 'text')} />
          </TouchableOpacity>
        </View>

        {!isDemo && (
          <View style={styles.subscriptionStatus} accessibilityLiveRegion="polite">
            <Text style={styles.subscriptionStatusText}>
              {restoreNeedsRetry
                ? t('subscription_unavailable')
                : purchaseNeedsCheck
                  ? t('subscription_verification_pending')
                  : subscription.status === 'loading'
                    ? t('subscription_checking')
                    : subscription.status === 'error'
                      ? t('subscription_unavailable')
                      : isFree
                        ? t('subscription_free')
                        : t('subscription_unverified')}
            </Text>
            <TouchableOpacity
              onPress={checkSubscriptionStatus}
              disabled={isPurchasing || subscription.status === 'loading'}
              accessibilityRole="button"
            >
              <Text style={styles.legalLink}>{t('subscription_check_again')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.heroSection}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={32} color={themeColor('#F59E0B', 'text')} />
          </View>
          <Text style={styles.heroTitle}>{t('subscription')}</Text>
        </View>

        {availabilityNotice}

        {newSubscriptionsAvailable &&
          (packages.length > 0 ? (
            <View style={styles.plansContainer}>
              <Text style={styles.plansTitle}>{t('choose_your_plan')}</Text>

              {/* TASARRUF ROZETİ KALDIRILDI.
                Eskiden yıllık planın üstünde sabit "Save 25%" yazıyordu.
                Mağazadaki gerçek oran bu değil ve bölgeye göre de
                değişiyor; doğrulanamayan bir tasarruf iddiası 2.3.1'dir.
                Fiyatlar zaten yan yana duruyor. */}
              {packages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.planCard,
                    selectedPackage?.id === pkg.id && styles.planCardSelected,
                  ]}
                  onPress={() => setSelectedPackage(pkg)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedPackage?.id === pkg.id }}
                  accessibilityLabel={`${planName(pkg)}, ${formatPrice(pkg)}`}
                >
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={styles.planName}>{planName(pkg)}</Text>
                      <Text style={styles.planPrice}>{formatPrice(pkg)}</Text>
                    </View>
                  </View>

                  {selectedPackage?.id === pkg.id && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={themeColor('#8B5CF6', 'text')}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noPackagesContainer}>
              <Ionicons
                name="cloud-offline-outline"
                size={48}
                color={themeColor('#9CA3AF', 'text')}
              />
              <Text style={styles.noPackagesTitle}>{t('subscription_not_available')}</Text>
              <Text style={styles.noPackagesText}>
                {t('in_app_purchases_are_being_configured_please')}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadOfferings}>
                <Text style={styles.retryButtonText}>{t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ))}

        {newSubscriptionsAvailable && (
          <TouchableOpacity
            style={[styles.purchaseButton, purchaseDisabled && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={purchaseDisabled}
          >
            {/* "Start Free Trial" ÇIKARILDI: ürünlerde tanımlı bir deneme
              olduğunu doğrulamadım ve olmayan bir denemeyi vaat etmek
              3.1.2'dir. Düğme ne yapacağını söylüyor. */}
            {isPurchasing ? (
              <ActivityIndicator color={themeColor('#fff', 'text')} />
            ) : (
              <Text style={styles.purchaseButtonText}>{t('subscribe')}</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isPurchasing}
        >
          <Text style={styles.restoreButtonText}>
            {restoreNeedsRetry ? t('retry') : t('restore_purchases')}
          </Text>
        </TouchableOpacity>

        {newSubscriptionsAvailable && (
          <Text style={styles.disclaimer}>
            • {t('sub_cancel_anytime')}
            {'\n'}• {t('sub_auto_renews')}
            {'\n'}• {t('sub_charged_apple')}
          </Text>
        )}

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://lilove.org/legal/privacy')}>
            <Text style={styles.legalLink}>{t('privacy_policy')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://lilove.org/legal/terms')}>
            <Text style={styles.legalLink}>{t('terms_of_service')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  subscriptionStatus: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  subscriptionStatusText: {
    color: '#374151',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeButton: {
    padding: 8,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  premiumBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  featuresContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  plansContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  planCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  planCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  savingsBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  purchaseButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    lineHeight: 18,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  legalLink: {
    fontSize: 13,
    color: '#8B5CF6',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  premiumActiveContainer: {
    padding: 24,
    alignItems: 'center',
  },
  crownIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumActiveTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  premiumActiveSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  manageButton: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  manageButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  noPackagesContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  noPackagesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noPackagesText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { loadSubscriptionProducts, buySubscription, restore, type StoreProduct } from '../services/iap';
import { periodOf, tierOf } from '../config/products';
import { api } from '../lib/api';
import { t } from '../i18n';

const features = [
  { icon: 'sparkles', title: t('advanced_ai_coaching'), description: t('personalized_guidance_from_our_ai_mentor') },
  { icon: 'infinite', title: t('unlimited_goals_habits'), description: t('track_as_many_goals_and_habits_as_you_want') },
  { icon: 'analytics', title: t('advanced_analytics'), description: t('deep_insights_into_your_progress') },
  { icon: 'trophy', title: t('premium_challenges'), description: t('access_exclusive_challenges_and_rewards') },
  { icon: 'people', title: t('priority_support'), description: t('get_help_when_you_need_it') },
  { icon: 'color-palette', title: t('custom_themes'), description: t('personalize_your_experience') },
];

export default function PremiumScreen({ navigation }: any) {
  const { user, userProfile, updateUser } = useAuthStore();
  const [packages, setPackages] = useState<StoreProduct[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<StoreProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
    checkSubscriptionStatus();
  }, []);

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

  // YETKİ SUNUCUDAN OKUNUR, İSTEMCİDEN DEĞİL.
  //
  // Abonelik durumunu Apple'a doğrulatan taraf sunucu; istemcinin
  // "premium'um" demesi bir iddiadır.
  const checkSubscriptionStatus = async () => {
    try {
      const durum = await api.getSubscriptionStatus();
      if (durum?.isPremium && user) {
        updateUser({ subscriptionTier: durum.subscriptionTier || 'pro' });
      }
    } catch (error) {
      // Durum okunamadıysa mevcut yetkiye dokunmuyoruz.
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert(t('please_select_a_subscription_plan'));
      return;
    }

    try {
      setIsPurchasing(true);
      await buySubscription(selectedPackage.id);
      // Satın alma bitti demek, yetki verildi demek değil: sunucu
      // Apple'a doğrulattıktan SONRA durumu yeniden okuyoruz.
      await checkSubscriptionStatus();
      updateUser({ subscriptionTier: tierOf(selectedPackage.id) });
      Alert.alert(
        t('welcome_to_premium'),
        t('you_now_have_access_to_all_premium_features'),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const kod = String(error?.code ?? '');
      const iptal =
        kod.includes('USER_CANCELLED') ||
        kod.includes('E_USER_CANCELLED') ||
        /cancel/i.test(String(error?.message ?? ''));
      if (!iptal) {
        Alert.alert(t('purchase_failed'), error?.message || t('please_try_again'));
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // GERİ YÜKLEME GERÇEKTEN GERİ YÜKLER: cihazdaki her abonelik işlemi
  // sunucuya yeniden doğrulatılır, sonra yetki sunucudan okunur.
  const handleRestore = async () => {
    try {
      setIsPurchasing(true);
      const sayi = await restore();
      await checkSubscriptionStatus();
      if (sayi > 0) {
        Alert.alert(t('subscription_restored'), t('your_subscription_has_been_restored'));
      } else {
        Alert.alert(t('no_subscription_found'), t('no_active_subscription_found_to_restore'));
      }
    } catch (error) {
      Alert.alert(t('restore_failed'), t('failed_to_restore_purchases_please_try_again'));
    } finally {
      setIsPurchasing(false);
    }
  };

  // FİYAT MAĞAZANIN BİÇİMLENDİRDİĞİ HÂLİYLE GÖSTERİLİR.
  // Kendimiz para birimi ya da ayraç seçmiyoruz: 175 bölgede farklı.
  const formatPrice = (pkg: StoreProduct) =>
    `${pkg.displayPrice}${periodOf(pkg.id) === 'yearly' ? '/year' : '/month'}`;

  const planName = (pkg: StoreProduct) => {
    const katman = tierOf(pkg.id) === 'team' ? 'Team' : 'Pro';
    const donem = periodOf(pkg.id) === 'yearly' ? 'Annual' : 'Monthly';
    return `${katman} ${donem}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>{t('loading_subscription_options')}</Text>
      </View>
    );
  }

  // Mağaza ürünleri gelmediyse ekran bunu SÖYLER ve tekrar dener.
  const showNoPackagesMessage = packages.length === 0;

  if (userProfile?.subscriptionTier === 'premium' || userProfile?.isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.premiumActiveContainer}>
            <View style={styles.crownIcon}>
              <Ionicons name="trophy" size={48} color="#8B5CF6" />
            </View>
            <Text style={styles.premiumActiveTitle}>{t('you_re_a_premium_member')}</Text>
            <Text style={styles.premiumActiveSubtitle}>{t('thank_you_for_supporting_lilove_enjoy_all_pr')}</Text>

            <View style={styles.featuresContainer}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name={feature.icon as any} size={24} color="#8B5CF6" />
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.manageButton}
              onPress={() => Alert.alert(t('manage_subscription'), t('please_go_to_settings_subscriptions_on_your'))}
            >
              <Text style={styles.manageButtonText}>{t('manage_subscription')}</Text>
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
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={32} color="#F59E0B" />
          </View>
          <Text style={styles.heroTitle}>{t('unlock_your_full_potential')}</Text>
          <Text style={styles.heroSubtitle}>{t('get_unlimited_access_to_all_premium_features')}</Text>
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon as any} size={20} color="#8B5CF6" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {packages.length > 0 ? (
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
                  selectedPackage?.id === pkg.id && styles.planCardSelected
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
                    <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.noPackagesContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noPackagesTitle}>{t('subscription_not_available')}</Text>
            <Text style={styles.noPackagesText}>{t('in_app_purchases_are_being_configured_please')}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadOfferings}
            >
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={isPurchasing}
        >
          {/* "Start Free Trial" ÇIKARILDI: ürünlerde tanımlı bir deneme
              olduğunu doğrulamadım ve olmayan bir denemeyi vaat etmek
              3.1.2'dir. Düğme ne yapacağını söylüyor. */}
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseButtonText}>{t('subscribe')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isPurchasing}
        >
          <Text style={styles.restoreButtonText}>{t('restore_purchases')}</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          • Cancel anytime in Settings{'\n'}
          • Subscription auto-renews unless cancelled at least 24 hours before the end of the period{'\n'}
          • Payment is charged to your Apple Account at confirmation of purchase
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
// =====================================================================
//  JETON MAĞAZASI
//
//  Uygulama jeton harcıyordu (avatar özellikleri, mağaza kalemleri) ve
//  jeton kazandırıyordu (başarımlar) — ama SATIN ALMA YOLU YOKTU. App
//  Store Connect'teki dört tüketilebilir ürün kodda hiç geçmiyordu.
//  Bu ekran o boşluğu kapatıyor.
//
//  EKRANDAKİ HER FİYAT MAĞAZADAN GELİYOR. Tek bir sabit fiyat yok:
//  `displayPrice` kullanıcının kendi bölgesinin para birimiyle,
//  Apple'ın biçimlendirmesiyle gelir.
//
//  BAKİYEYİ EKRAN YAZMIYOR. Satın alma bittikten sonra bakiye
//  SUNUCUDAN yeniden okunuyor. İstemcinin "artık 500 jetonum var"
//  demesi bir iddiadır; sunucunun söylemesi bir gerçektir.
// =====================================================================
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COIN_AMOUNTS, type CoinId } from '../config/products';
import { buyCoins, loadCoinProducts, type StoreProduct } from '../services/iap';
import { useCoinBalance } from '../hooks/useCoinBalance';
import { t } from '../i18n';
import { purchaseBlockedInDemo } from '../lib/accountGate';
import { useThemedStyles, useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { areNewCoinPurchasesAvailable } from '../lib/coinAvailability';

export default function CoinsScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const styles = useThemedStyles(baseStyles);
  const { color: themeColor } = useTheme();
  const coins = useCoinBalance();
  const isDemo = useAuthStore((state) => state.isDemo);
  const coinSalesAvailable = areNewCoinPurchasesAvailable();

  const [urunler, setUrunler] = useState<StoreProduct[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [alinan, setAlinan] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    setUrunler([]);
    if (isDemo || !coinSalesAvailable) {
      setYukleniyor(false);
      return;
    }
    try {
      const p = await loadCoinProducts();
      setUrunler(p);
      if (p.length === 0) {
        setHata(t('coin_shop_unavailable'));
      }
    } catch {
      setHata(t('coin_shop_load_failed'));
    } finally {
      setYukleniyor(false);
    }
  }, [isDemo, coinSalesAvailable]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const satinAl = async (urun: StoreProduct) => {
    if (purchaseBlockedInDemo() || !coinSalesAvailable) return;
    try {
      setAlinan(urun.id);
      const result = await coins.confirm(() => buyCoins(urun.id));
      if (result !== 'updated') return;
      Alert.alert(
        t('coins_added'),
        t('coin_shop_added').replace('{count}', String(COIN_AMOUNTS[urun.id as CoinId] ?? ''))
      );
    } catch (e: unknown) {
      // Kullanıcının vazgeçmesi bir hata değildir; uyarı göstermiyoruz.
      const code = e && typeof e === 'object' && 'code' in e ? e.code : undefined;
      const message = e && typeof e === 'object' && 'message' in e ? e.message : undefined;
      const kod = String(code ?? '');
      const iptal =
        kod.includes('USER_CANCELLED') ||
        kod.includes('E_USER_CANCELLED') ||
        /cancel/i.test(String(message ?? ''));
      if (!iptal) {
        Alert.alert(t('purchase_failed_2'), t('please_try_again_2'));
      }
    } finally {
      setAlinan(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel={t('close')}
        >
          <Ionicons name="close" size={24} color={themeColor('#1F2937', 'text')} />
        </TouchableOpacity>
        <View style={styles.coinBadge}>
          <Ionicons name="wallet" size={16} color={themeColor('#92400E', 'text')} />
          <Text style={styles.coinText}>{coins.balance ?? '—'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('coins')}</Text>
        {coinSalesAvailable && <Text style={styles.subtitle}>{t('coin_shop_about')}</Text>}
        {isDemo && <Text style={styles.subtitle}>{t('coin_shop_demo')}</Text>}

        {coins.status === 'error' && (
          <View style={styles.hataKutu}>
            <Text style={styles.hataMetin} accessibilityRole="alert">
              {t('coin_balance_unavailable')}
            </Text>
            <TouchableOpacity
              style={styles.tekrarDugme}
              onPress={() => coins.refresh()}
              accessibilityRole="button"
              testID="button-retry-coin-balance"
            >
              <Text style={styles.tekrarMetin}>{t('try_again_2')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isDemo || !coinSalesAvailable ? (
          <View style={styles.merkez}>
            <Ionicons
              name="information-circle-outline"
              size={28}
              color={themeColor('#B45309', 'text')}
            />
            <Text style={styles.hataMetin}>{t('coin_shop_unavailable')}</Text>
          </View>
        ) : yukleniyor ? (
          <View style={styles.merkez}>
            <ActivityIndicator size="large" color={themeColor('#8B5CF6', 'text')} />
          </View>
        ) : hata ? (
          <View style={styles.hataKutu}>
            <Ionicons
              name="information-circle-outline"
              size={28}
              color={themeColor('#B45309', 'text')}
            />
            <Text style={styles.hataMetin}>{hata}</Text>
            <TouchableOpacity
              style={styles.tekrarDugme}
              onPress={() => {
                void coins.refresh();
                void yukle();
              }}
            >
              <Text style={styles.tekrarMetin}>{t('try_again_2')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          urunler.map((u) => {
            const miktar = COIN_AMOUNTS[u.id as CoinId];
            const mesgul = alinan !== null;
            return (
              <TouchableOpacity
                key={u.id}
                style={[styles.paket, mesgul && styles.paketSolgun]}
                disabled={mesgul}
                onPress={() => satinAl(u)}
                accessibilityRole="button"
                accessibilityLabel={t('coin_shop_pack')
                  .replace('{count}', String(miktar))
                  .replace('{price}', u.displayPrice)}
              >
                <View style={styles.paketSol}>
                  <View style={styles.paketIkon}>
                    <Ionicons name="wallet" size={20} color={themeColor('#92400E', 'text')} />
                  </View>
                  <View>
                    <Text style={styles.paketMiktar}>{miktar?.toLocaleString() ?? u.title}</Text>
                    <Text style={styles.paketAlt}>{t('coins')}</Text>
                  </View>
                </View>
                {alinan === u.id ? (
                  <ActivityIndicator color={themeColor('#8B5CF6', 'text')} />
                ) : (
                  <Text style={styles.paketFiyat}>{u.displayPrice}</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {!isDemo && coinSalesAvailable && urunler.length > 0 && (
          <Text style={styles.kucukMetin}>{t('coin_shop_payment')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButton: { padding: 8 },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  coinText: { color: '#92400E', fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#1F2937', marginTop: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 8, lineHeight: 22 },
  merkez: { paddingVertical: 48, alignItems: 'center' },
  paket: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  paketSolgun: { opacity: 0.55 },
  paketSol: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paketIkon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paketMiktar: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  paketAlt: { fontSize: 13, color: '#6B7280' },
  paketFiyat: { fontSize: 17, fontWeight: '700', color: '#7C3AED' },
  hataKutu: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  hataMetin: { color: '#92400E', textAlign: 'center' },
  tekrarDugme: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tekrarMetin: { color: '#FFFFFF', fontWeight: '700' },
  kucukMetin: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 24,
    lineHeight: 18,
  },
});

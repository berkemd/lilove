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
import { api } from '../lib/api';

export default function CoinsScreen({ navigation }: any) {
  const [urunler, setUrunler] = useState<StoreProduct[]>([]);
  const [bakiye, setBakiye] = useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [alinan, setAlinan] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const bakiyeOku = useCallback(async () => {
    try {
      const d = await api.getCoinBalance();
      setBakiye(typeof d?.balance === 'number' ? d.balance : null);
    } catch {
      setBakiye(null);
    }
  }, []);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const p = await loadCoinProducts();
      setUrunler(p);
      if (p.length === 0) {
        setHata('The App Store is not reachable right now.');
      }
    } catch (e: any) {
      setHata(e?.message || 'The App Store is not reachable right now.');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
    bakiyeOku();
  }, [yukle, bakiyeOku]);

  const satinAl = async (urun: StoreProduct) => {
    try {
      setAlinan(urun.id);
      await buyCoins(urun.id);
      await bakiyeOku();
      Alert.alert(
        'Coins added',
        `${COIN_AMOUNTS[urun.id as CoinId] ?? ''} coins are now in your balance.`
      );
    } catch (e: any) {
      // Kullanıcının vazgeçmesi bir hata değildir; uyarı göstermiyoruz.
      const kod = String(e?.code ?? '');
      const iptal =
        kod.includes('USER_CANCELLED') ||
        kod.includes('E_USER_CANCELLED') ||
        /cancel/i.test(String(e?.message ?? ''));
      if (!iptal) {
        Alert.alert('Purchase failed', e?.message || 'Please try again.');
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
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.coinBadge}>
          <Ionicons name="wallet" size={16} color="#92400E" />
          <Text style={styles.coinText}>{bakiye ?? '—'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Coins</Text>
        <Text style={styles.subtitle}>
          Coins unlock avatar traits and shop items. You also earn them by
          completing goals, habits and achievements — buying is never required.
        </Text>

        {yukleniyor ? (
          <View style={styles.merkez}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : hata ? (
          <View style={styles.hataKutu}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B45309" />
            <Text style={styles.hataMetin}>{hata}</Text>
            <TouchableOpacity style={styles.tekrarDugme} onPress={yukle}>
              <Text style={styles.tekrarMetin}>Try again</Text>
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
                accessibilityLabel={`${miktar} coins for ${u.displayPrice}`}
              >
                <View style={styles.paketSol}>
                  <View style={styles.paketIkon}>
                    <Ionicons name="wallet" size={20} color="#92400E" />
                  </View>
                  <View>
                    <Text style={styles.paketMiktar}>
                      {miktar?.toLocaleString() ?? u.title}
                    </Text>
                    <Text style={styles.paketAlt}>coins</Text>
                  </View>
                </View>
                {alinan === u.id ? (
                  <ActivityIndicator color="#8B5CF6" />
                ) : (
                  <Text style={styles.paketFiyat}>{u.displayPrice}</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.kucukMetin}>
          Coins are a one-time purchase, consumed inside LiLove. They do not
          expire and are not transferable. Payment is charged to your Apple
          Account at confirmation.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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

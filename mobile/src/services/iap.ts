// =====================================================================
//  IAP — Apple'ın kendi StoreKit'i, aracısız  (expo-iap 2.8.5)
//
//  NEDEN RevenueCat DEĞİL
//    Sunucuda zaten Apple'ın resmî `@apple/app-store-server-library`si
//    kurulu: imzalı işlem doğrulama, abonelik durumu ve App Store
//    bildirim webhook'u yazılmış. Üstüne bir de RevenueCat koymak aynı
//    işi ikinci kez yapan, istemciye üçüncü taraf anahtarı koyan ve
//    ürünleri ayrı bir panelde eşlemeyi gerektiren bir katmandı.
//    Üstelik oradaki anahtar `appl_XXXXXXXX` yer tutucusuydu:
//    yapılandırma HİÇ tamamlanmamıştı.
//
//    Tek SDK kuralı ayrıca teknik: iki IAP kütüphanesi aynı anda
//    StoreKit işlem kuyruğunu dinlerse işlemi kimin bitireceği
//    belirsizleşir.
//
//  API ÖLÇÜLDÜ, TAHMİN EDİLMEDİ
//    Sürüm 2.8.5'te KİLİTLİ ve sebebi ölçüldü: 3.2.0'dan itibaren
//    paketin yerel kodu `Constant(` (tekil) kullanıyor ve o fabrika
//    yalnız expo-modules-core 2.4+/SDK 53'te var. Bu proje SDK 52.
//    API paketin kendi `build/index.d.ts`inden okundu:
//        requestProducts({ skus, type: 'inapp' | 'subs' })
//        requestPurchase({ request: { ios: { sku } }, type })
//        finishTransaction({ purchase, isConsumable })
//    ve en önemlisi: `requestPurchase` OLAY TABANLI. Sonucu dönüş
//    değerinden okumak yanlış; sonuç `purchaseUpdatedListener`a düşer.
//    Bu yüzden aşağıda satın alma, dinleyicinin çözdüğü bir söz
//    (promise) olarak modelleniyor.
//
//  SIRA PAZARLIK KONUSU DEĞİL
//    doğrula → SONRA bitir. İşlem sunucu doğrulamadan bitirilir ve o
//    anda ağ koparsa, kullanıcı ödemiş ama jetonu hiç almamış olur ve
//    StoreKit o işlemi bir daha hatırlatmaz. Bitirmeyi geciktirmenin
//    bedeli bir kez daha denemek; erken bitirmenin bedeli kaybolmuş
//    bir satın alma.
// =====================================================================
import {
  initConnection,
  endConnection,
  requestProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'expo-iap';
import { Platform } from 'react-native';
// Ekranların tamamı `lib/api`yi kullanıyor; ikinci bir istemciye
// bağlanmak, iki ayrı yeniden deneme ve hata politikası demek olurdu.
import { api } from '../lib/api';
import { COIN_IDS, SUBSCRIPTION_IDS, isCoinProduct } from '../config/products';

export type StoreProduct = {
  id: string;
  displayPrice: string;
  title: string;
  description: string;
};

type Bekleyen = {
  coz: () => void;
  reddet: (e: any) => void;
  zamanlayici: ReturnType<typeof setTimeout>;
};

let baglandi = false;
let aboneler: Array<{ remove: () => void }> = [];
const bekleyenler = new Map<string, Bekleyen>();

function urunKimligi(p: any): string {
  return String(p?.productId ?? p?.id ?? '');
}

function islemKimligi(p: any): string {
  return String(
    p?.transactionId ??
      p?.id ??
      p?.originalTransactionIdentifierIOS ??
      ''
  );
}

function bekleyeniBitir(productId: string, hata?: any) {
  const b = bekleyenler.get(productId);
  if (!b) return;
  bekleyenler.delete(productId);
  clearTimeout(b.zamanlayici);
  hata ? b.reddet(hata) : b.coz();
}

/**
 * Sunucu doğrulaması bitmeden işlemi bitirmeyen tek yol.
 *
 * Hata durumunda işlem BİLEREK bitirilmiyor: StoreKit onu bir sonraki
 * açılışta yeniden sunar ve `purchaseUpdatedListener` tekrar dener.
 * Sunucu tarafı `sourceId = transactionId` ile tekrarları eliyor, yani
 * ikinci kez doğrulamak ikinci kez jeton vermez.
 */
async function dogrulaVeBitir(purchase: any): Promise<void> {
  const islemId = islemKimligi(purchase);
  if (!islemId) throw new Error('Purchase has no transaction id');

  await api.verifyPurchase(islemId);

  await finishTransaction({
    purchase,
    isConsumable: isCoinProduct(urunKimligi(purchase)),
  });
}

export async function initIAP(): Promise<void> {
  if (baglandi || Platform.OS !== 'ios') return;
  await initConnection();
  baglandi = true;

  // BİTMEMİŞ İŞLEMLERİ DEVRAL.
  //
  // Uygulama satın alma sırasında öldürülürse StoreKit işlemi saklar ve
  // her açılışta yeniden sunar. Bu dinleyici olmadan o satın alma
  // askıda kalır: kullanıcı ödemiştir, jeton gelmemiştir.
  aboneler.push(
    purchaseUpdatedListener(async (purchase: any) => {
      const pid = urunKimligi(purchase);
      try {
        await dogrulaVeBitir(purchase);
        bekleyeniBitir(pid);
      } catch (e) {
        bekleyeniBitir(pid, e);
        if (__DEV__) console.warn('[IAP] işlem doğrulanamadı, açılışta yeniden denenecek', e);
      }
    })
  );

  aboneler.push(
    purchaseErrorListener((e: any) => {
      // Hangi ürün olduğunu Apple her zaman söylemiyor; kimlik yoksa
      // bekleyen TEK satın almayı reddediyoruz (aynı anda iki satın
      // alma başlatılamaz, düğmeler kilitli).
      const pid = urunKimligi(e);
      if (pid && bekleyenler.has(pid)) bekleyeniBitir(pid, e);
      else if (bekleyenler.size === 1) {
        const tek = Array.from(bekleyenler.keys())[0];
        bekleyeniBitir(tek, e);
      }
    })
  );
}

export async function closeIAP(): Promise<void> {
  aboneler.forEach((a) => a.remove());
  aboneler = [];
  bekleyenler.forEach((b) => clearTimeout(b.zamanlayici));
  bekleyenler.clear();
  if (baglandi) {
    await endConnection();
    baglandi = false;
  }
}

function esle(p: any): StoreProduct {
  return {
    id: urunKimligi(p),
    displayPrice: String(p?.displayPrice ?? p?.localizedPrice ?? ''),
    title: String(p?.title ?? ''),
    description: String(p?.description ?? ''),
  };
}

/**
 * BOŞ LİSTE DE BAŞARISIZLIKTIR.
 *
 * `fetchProducts` ağ hazır değilken hata atmadan boş dönebiliyor. Onu
 * "başarı" saymak, ürünsüz bir ödeme ekranını sessizce kabul etmek
 * olurdu — VagoTakt tam bu yüzden reddedildi. Üç deneme, artan bekleme.
 */
async function ısrarla(f: () => Promise<any>): Promise<any[]> {
  let bekleme = 400;
  for (let deneme = 1; deneme <= 3; deneme++) {
    try {
      const sonuc = await f();
      const dizi = Array.isArray(sonuc) ? sonuc : [];
      if (dizi.length > 0) return dizi;
    } catch (e) {
      if (deneme === 3) throw e;
    }
    if (deneme < 3) {
      await new Promise((r) => setTimeout(r, bekleme));
      bekleme *= 3;
    }
  }
  return [];
}

function sirala(urunler: StoreProduct[], sira: readonly string[]): StoreProduct[] {
  return [...urunler].sort((a, b) => sira.indexOf(a.id) - sira.indexOf(b.id));
}

export async function loadCoinProducts(): Promise<StoreProduct[]> {
  const p = await ısrarla(() => requestProducts({ skus: [...COIN_IDS], type: 'inapp' }));
  return sirala(p.map(esle), COIN_IDS);
}

export async function loadSubscriptionProducts(): Promise<StoreProduct[]> {
  const p = await ısrarla(() => requestProducts({ skus: [...SUBSCRIPTION_IDS], type: 'subs' }));
  return sirala(p.map(esle), SUBSCRIPTION_IDS);
}

/**
 * Satın almayı başlatır ve SONUCU BEKLER.
 *
 * `requestPurchase` olay tabanlı olduğu için dönüş değerine güvenmek
 * yanlış olurdu; söz, `purchaseUpdatedListener` sunucu doğrulamasını
 * bitirdiğinde çözülüyor. Zaman aşımı var çünkü kullanıcı ödeme
 * sayfasını açık bırakıp uygulamadan çıkabilir — o durumda ekranın
 * sonsuza kadar dönmesi kabul edilemez; işlem askıda kalır ve bir
 * sonraki açılışta dinleyici onu tamamlar.
 */
function satinAl(productId: string, tur: 'inapp' | 'subs'): Promise<void> {
  return new Promise<void>((coz, reddet) => {
    const zamanlayici = setTimeout(() => {
      bekleyenler.delete(productId);
      reddet(new Error('PURCHASE_TIMEOUT'));
    }, 180_000);

    bekleyenler.set(productId, { coz, reddet, zamanlayici });

    requestPurchase({
      request: { ios: { sku: productId } },
      type: tur,
    }).catch((e: any) => bekleyeniBitir(productId, e));
  });
}

export function buyCoins(productId: string): Promise<void> {
  return satinAl(productId, 'inapp');
}

export function buySubscription(productId: string): Promise<void> {
  return satinAl(productId, 'subs');
}

/**
 * GERİ YÜKLEME GERÇEKTEN GERİ YÜKLER.
 *
 * Yalnız "geri yüklendi" yazan bir düğme 3.1.1'de reddedilir. Burada
 * cihazdaki her abonelik işlemi sunucuya yeniden doğrulatılıyor; yeni
 * cihazda abonelik böyle geri gelir. Tüketilebilir jetonlar geri
 * yüklenmez — Apple da onları geri vermez, bakiye zaten hesapta durur.
 *
 * @returns sunucunun kabul ettiği abonelik işlemi sayısı
 */
export async function restore(): Promise<number> {
  const mevcut: any[] = (await getAvailablePurchases()) ?? [];
  let sayi = 0;
  for (const p of mevcut) {
    if (isCoinProduct(urunKimligi(p))) continue;
    const islemId = islemKimligi(p);
    if (!islemId) continue;
    try {
      await api.verifyPurchase(islemId);
      sayi++;
    } catch {
      // tek bir kaydın düşmesi diğerlerini durdurmasın
    }
  }
  return sayi;
}

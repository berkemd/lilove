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
  type Purchase,
} from 'expo-iap';
import { Platform } from 'react-native';
// Ekranların tamamı `lib/api`yi kullanıyor; ikinci bir istemciye
// bağlanmak, iki ayrı yeniden deneme ve hata politikası demek olurdu.
import { api } from '../lib/api';
import { COIN_IDS, SUBSCRIPTION_IDS, isCoinProduct } from '../config/products';
import { tokenManager } from './tokenManager';
import { DEMO_TOKEN } from '../lib/demoData';
import { assertNewSubscriptionAvailable } from '../lib/subscriptionAvailability';
import { assertNewCoinPurchaseAvailable } from '../lib/coinAvailability';

/**
 * No purchase or restore is ever STARTED in the demo tour.
 *
 * The screens already stop and explain (lib/accountGate.ts). This is the
 * second lock, for any future screen that forgets. Without it, Apple
 * takes the payment and our server refuses to verify it: paid, and
 * nothing received.
 */
async function hesapGerekir(): Promise<string> {
  const token = await tokenManager.getToken();
  if (!token || token === DEMO_TOKEN) {
    throw Object.assign(new Error('Purchases need an account.'), { code: 'ACCOUNT_REQUIRED' });
  }
  return token;
}

export type StoreProduct = {
  id: string;
  displayPrice: string;
  title: string;
  description: string;
};

type Bekleyen = {
  coz: () => void;
  reddet: (e: unknown) => void;
  zamanlayici: ReturnType<typeof setTimeout>;
};

let baglandi = false;
let baglanti: Promise<void> | null = null;
let aboneler: Array<{ remove: () => void }> = [];
const bekleyenler = new Map<string, Bekleyen>();

function urunKimligi(p: { productId?: unknown; id?: unknown } | null | undefined): string {
  return String(p?.productId ?? p?.id ?? '');
}

function islemKimligi(
  p:
    | { transactionId?: unknown; id?: unknown; originalTransactionIdentifierIOS?: unknown }
    | null
    | undefined
): string {
  return String(p?.transactionId ?? p?.id ?? p?.originalTransactionIdentifierIOS ?? '');
}

function bekleyeniBitir(productId: string, hata?: unknown) {
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
 * Sunucu aynı işlem kimliğini yeniden alabilir; istemci yalnız açık
 * başarı yanıtından sonra StoreKit işlemini tamamlar.
 */
async function dogrula(islemId: string, authorizationToken?: string): Promise<void> {
  const sonuc = await api.verifyPurchase(islemId, authorizationToken);
  if (sonuc?.success !== true) throw new Error('Purchase verification was not confirmed');
}

async function dogrulaVeBitir(purchase: Purchase): Promise<void> {
  const islemId = islemKimligi(purchase);
  if (!islemId) throw new Error('Purchase has no transaction id');

  await dogrula(islemId);

  await finishTransaction({
    purchase,
    isConsumable: isCoinProduct(urunKimligi(purchase)),
  });
}

export async function initIAP(): Promise<void> {
  if (baglandi || Platform.OS !== 'ios') return;
  if (baglanti) return baglanti;
  const pending = baglantiKur();
  baglanti = pending;
  try {
    await pending;
  } finally {
    if (baglanti === pending) baglanti = null;
  }
}

async function baglantiKur(): Promise<void> {
  await initConnection();
  baglandi = true;

  // BİTMEMİŞ İŞLEMLERİ DEVRAL.
  //
  // Uygulama satın alma sırasında öldürülürse StoreKit işlemi saklar ve
  // her açılışta yeniden sunar. Bu dinleyici olmadan o satın alma
  // askıda kalır: kullanıcı ödemiştir, jeton gelmemiştir.
  aboneler.push(
    purchaseUpdatedListener(async (purchase) => {
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
    purchaseErrorListener((e) => {
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

function esle(p: {
  id?: unknown;
  productId?: unknown;
  displayPrice?: unknown;
  localizedPrice?: unknown;
  title?: unknown;
  description?: unknown;
}): StoreProduct {
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
async function ısrarla<T>(f: () => Promise<T[]>): Promise<T[]> {
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
async function satinAl(productId: string, tur: 'inapp' | 'subs'): Promise<void> {
  await hesapGerekir();
  if (tur === 'subs' || (SUBSCRIPTION_IDS as readonly string[]).includes(productId)) {
    assertNewSubscriptionAvailable();
  }
  if (tur === 'inapp' || (COIN_IDS as readonly string[]).includes(productId)) {
    assertNewCoinPurchaseAvailable();
  }
  const hesap = await api.getIapAccountToken(productId);
  const appAccountToken = hesap?.appAccountToken;
  if (
    typeof appAccountToken !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      appAccountToken
    )
  ) {
    throw new Error('Purchase account token is unavailable');
  }
  return new Promise<void>((coz, reddet) => {
    const zamanlayici = setTimeout(() => {
      bekleyenler.delete(productId);
      reddet(new Error('PURCHASE_TIMEOUT'));
    }, 180_000);

    bekleyenler.set(productId, { coz, reddet, zamanlayici });

    requestPurchase({
      request: { ios: { sku: productId, appAccountToken } },
      type: tur,
    }).catch((e: unknown) => bekleyeniBitir(productId, e));
  });
}

export function buyCoins(productId: string): Promise<void> {
  return satinAl(productId, 'inapp');
}

export function buySubscription(productId: string): Promise<void> {
  return satinAl(productId, 'subs');
}

export class RestoreError extends Error {
  readonly code = 'RESTORE_INCOMPLETE';

  constructor(
    readonly stage: 'store' | 'verification' | 'account',
    readonly verifiedCount = 0,
    readonly failedCount = 0
  ) {
    super(
      stage === 'store'
        ? 'Store purchases could not be read'
        : stage === 'account'
          ? 'Restore session changed'
          : 'Restore verification incomplete'
    );
    this.name = 'RestoreError';
  }
}

/**
 * Verify every available non-consumable receipt before confirming a complete
 * restore. Existing verified receipts may be retried after a partial failure;
 * the server owns idempotent entitlement delivery. Coins remain account-bound.
 * @returns the confirmed count only when every eligible receipt was verified
 */
export async function restore(): Promise<number> {
  const token = await hesapGerekir();
  let sessionChanged = false;
  const unsubscribe = tokenManager.onTokenChange((currentToken) => {
    if (currentToken !== token) sessionChanged = true;
  });
  const assertSession = async () => {
    const currentToken = await tokenManager.getToken();
    if (sessionChanged || currentToken !== token) {
      throw new RestoreError('account');
    }
  };
  try {
    return await restoreForSession(token, assertSession);
  } finally {
    unsubscribe();
  }
}

async function restoreForSession(
  token: string,
  assertSession: () => Promise<void>
): Promise<number> {
  await assertSession();
  try {
    // Startup may have failed while offline. Restore must be able to retry it.
    await initIAP();
  } catch {
    throw new RestoreError('store');
  }
  await assertSession();
  let mevcut: Purchase[];
  try {
    const purchases = await getAvailablePurchases();
    if (!Array.isArray(purchases)) throw new RestoreError('store');
    mevcut = purchases;
  } catch {
    throw new RestoreError('store');
  }
  await assertSession();
  let sayi = 0;
  let basarisiz = 0;
  for (const p of mevcut) {
    await assertSession();
    if (isCoinProduct(urunKimligi(p))) continue;
    const islemId = islemKimligi(p);
    if (!islemId) {
      basarisiz++;
      continue;
    }
    try {
      // Pin the initiating token even if the account changes after the check.
      await dogrula(islemId, token);
      sayi++;
    } catch {
      // Try the remaining records, but an incomplete check is never "no purchases".
      basarisiz++;
    }
    await assertSession();
  }
  await assertSession();
  if (basarisiz > 0) throw new RestoreError('verification', sayi, basarisiz);
  return sayi;
}

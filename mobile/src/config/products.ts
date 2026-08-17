// =====================================================================
//  ÜRÜN KİMLİKLERİ — App Store Connect'ten KOPYALANDI, uydurulmadı
//
//  NE OLMUŞTU
//    Bu dosyanın yerinde `revenueCat.ts` duruyordu ve şu dört kimliği
//    sayıyordu:
//        lilove_premium_monthly · lilove_premium_yearly
//        lilove_team_monthly    · lilove_team_yearly
//    App Store Connect'te bu kimliklerin HİÇBİRİ yok. Oradaki sekiz ürün
//    şunlar:
//        org.lilove.app.sub.pro.monthly    org.lilove.app.sub.pro.yearly
//        org.lilove.app.sub.team.monthly   org.lilove.app.sub.team.yearly
//        org.lilove.app.coins.100/500/1000/5000
//    Yani uygulama, var olmayan ürünleri istiyordu: ödeme ekranı boş
//    açılır, inceleyici "satın alınamıyor" der ve bu bir 2.1 reddidir.
//
//  JETONLARIN KODU HİÇ YAZILMAMIŞTI
//    Uygulama jeton HARCIYOR (avatar özellikleri, mağaza), jeton
//    KAZANDIRIYOR (başarımlar) — ama satın alma yolu yoktu. Sunucudaki
//    tek jeton satın alma yolu Paddle'ın web ödemesiydi; bir iOS
//    uygulamasında dijital para birimini dış ödeme sayfasında satmak
//    doğrudan 3.1.1 ihlalidir.
//
//  FİYAT BURADA YAZMIYOR — BİLEREK
//    Eski dosyada `price: '$9.99'` gibi sabitler vardı ve mağazadaki
//    gerçek fiyatla ilgisi yoktu. Fiyat 175 bölgede farklı, her an
//    değişebilir ve tek doğru kaynağı StoreKit'tir. Ekranda görünen her
//    fiyat `Product.displayPrice`ten gelir.
// =====================================================================

/** Otomatik yenilenen abonelikler. Sıra ekranda gösterim sırasıdır. */
export const SUBSCRIPTION_IDS = [
  'org.lilove.app.sub.pro.monthly',
  'org.lilove.app.sub.pro.yearly',
  'org.lilove.app.sub.team.monthly',
  'org.lilove.app.sub.team.yearly',
] as const;

/** Tüketilebilir jeton paketleri, küçükten büyüğe. */
export const COIN_IDS = [
  'org.lilove.app.coins.100',
  'org.lilove.app.coins.500',
  'org.lilove.app.coins.1000',
  'org.lilove.app.coins.5000',
] as const;

export type SubscriptionId = (typeof SUBSCRIPTION_IDS)[number];
export type CoinId = (typeof COIN_IDS)[number];

export const ALL_PRODUCT_IDS: string[] = [...SUBSCRIPTION_IDS, ...COIN_IDS];

// JETON MİKTARI YALNIZCA GÖSTERİM İÇİN.
//
// Bakiyeyi sunucu yazar ve miktarı Apple'ın söylediği ürün kimliğinden
// TÜRETİR (`server/payments/apple.ts` içindeki COIN_PRODUCTS). Buradaki
// sayı yalnız düğmenin üstünde ne yazacağını belirler; istemci hiçbir
// zaman "bana şu kadar jeton ver" diyemez.
export const COIN_AMOUNTS: Record<CoinId, number> = {
  'org.lilove.app.coins.100': 100,
  'org.lilove.app.coins.500': 500,
  'org.lilove.app.coins.1000': 1000,
  'org.lilove.app.coins.5000': 5000,
};

export function isCoinProduct(productId: string): productId is CoinId {
  return Object.prototype.hasOwnProperty.call(COIN_AMOUNTS, productId);
}

export function isSubscriptionProduct(productId: string): boolean {
  return (SUBSCRIPTION_IDS as readonly string[]).includes(productId);
}

/** `org.lilove.app.sub.team.yearly` → 'team' */
export function tierOf(productId: string): 'pro' | 'team' | 'free' {
  if (productId.includes('.sub.team.')) return 'team';
  if (productId.includes('.sub.pro.')) return 'pro';
  return 'free';
}

/** `…yearly` → 'yearly'. Dönem metnini StoreKit'ten değil buradan almak
 *  yalnızca SIRALAMA ve ETİKET içindir; fiyat her zaman mağazadan. */
export function periodOf(productId: string): 'monthly' | 'yearly' {
  return productId.endsWith('yearly') ? 'yearly' : 'monthly';
}

# iOS ikilisi — ölçülmüş durum (18 Ağustos 2026)

## Yerel arşiv nerede duruyor

EAS'siz, parolasız bir yol denendi: `expo prebuild` ile Xcode projesi
üretilip `xcodebuild archive`. İmzalama ve yükleme için App Store Connect
API anahtarı (`~/.appstoreconnect/private_keys/AuthKey_7ZMTU3Q9TS.p8`)
kullanılıyor — parola girilmiyor.

| adım | sonuç |
|---|---|
| `npm install` | ✓ |
| `expo prebuild --platform ios --clean` | ✓ |
| `pod install --repo-update` | ✓ (`--repo-update` şart: `expo-iap 5.3.1` → `openiap 3.2.1`) |
| `xcodebuild archive` | **düşüyor** |

## Düşme sebebi

```
Pods/fmt/include/fmt/format-inl.h:59:24: error: call to consteval
function 'fmt::basic_format_string<...>::basic_format_string
<FMT_COMPILE_STRING, 0>' is not a constant expression
```

React Native 0.76'nın sabitlediği **fmt 11.0.2**, Xcode 26'nın
derleyicisinde C++20 `consteval` kuralına takılıyor. Kod bağımlılığın
içinde.

## Denenen ve ÇALIŞMAYAN düzeltme — ve nedeni

`FMT_CONSTEVAL`ı boş tanımlayan bir Expo eklentisi yazıldı (Podfile'a
elle yama kalıcı değil: `prebuild` her koşumda üretiyor). Makro derleme
komutuna **gerçekten ulaştı** — build günlüğünde 159, `Pods.xcodeproj`
içinde 214 kez. Buna rağmen hata sürdü, çünkü `fmt/base.h` makroyu
**kendisi koşulsuz yeniden tanımlıyor**:

```c
#if FMT_USE_CONSTEVAL
#  define FMT_CONSTEVAL consteval
```

`FMT_USE_CONSTEVAL` de dışarıdan verilmeye karşı korumasız — başlık onu
da yeniden tanımlıyor. Yani **komut satırından bu iki makroyla çözülmez.**

Eklenti bu yüzden depodan çıkarıldı: çalışmayan bir düzeltmeyi tutmak,
bir sonraki denemeyi yanlış yerden başlatır.

## Kalan üç yol

1. **GitHub Actions** — depoda `ios-build-and-deploy.yml` dahil 15 iş
   akışı var ve GitHub'ın macOS koşucuları **yayın** Xcode kullanıyor.
   Hem fmt sorununun hem de beta-macOS/ITMS-90111 riskinin dışında.
   Gereken: `.github/` dosyalarını itebilmek için `workflow` kapsamı —
   `gh auth refresh -s workflow`.
2. **Xcode Cloud** — portföyün geri kalanının kullandığı yol; sır
   gerektirmez, Apple hesabıyla imzalar. Gereken: depoyu Xcode'dan
   Xcode Cloud'a bağlamak.
3. **fmt'yi yalnız kendi hedefinde C++17'ye düşürmek** — muhtemel ama
   diğer pod'lar fmt başlıklarını C++20'de derlediği için karışık
   standart riski var. Son çare.

## Ortam (ölçüldü)

```
macOS 27.0 (26A5388g · beta)   Xcode 26.6 · iOS SDK 26.5
node 20.20.2   CocoaPods 1.17.0   altool ✓
imzalama: iPhone Distribution: BERKE KAHRAMAN (87U9ZK37M2)
```

Beta macOS bilerek `--validate-app` ile sınanacaktı (yayımlamadan
ITMS-90111 kontrolü); arşiv oraya kadar gelemedi.

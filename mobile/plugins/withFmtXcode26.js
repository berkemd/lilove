/* =====================================================================
 *  fmt 11.0.2 × Xcode 26  —  ölçülmüş yama
 *
 *  SORUN
 *    React Native 0.76'nın sabitlediği fmt 11.0.2, Xcode 26'nın C++20
 *    `consteval` kurallarına takılıyor:
 *      fmt/format-inl.h:59: call to consteval function ... is not a
 *      constant expression
 *
 *  NEDEN KOMUT SATIRI YETMİYOR
 *    Önce `-DFMT_CONSTEVAL=` denedim; makro derleme komutuna gerçekten
 *    ulaştı (159 kez) ama hata sürdü. Başlığı okuyunca sebep çıktı:
 *
 *      113  #if !defined(__cpp_lib_is_constant_evaluated)
 *      126  #elif defined(__cpp_consteval)
 *      127  #    define FMT_USE_CONSTEVAL 1      // ← burada eziliyor
 *      133  #if FMT_USE_CONSTEVAL
 *      134  #    define FMT_CONSTEVAL consteval
 *
 *    Yani anahtar `FMT_CONSTEVAL` değil `FMT_USE_CONSTEVAL`, ve zincirin
 *    başında DIŞARIDAN VERİLENİ KORUYAN bir dal yok. Dışarıdan ne
 *    verirsen ver, başlık ayrıştırılırken üzerine yazılıyor.
 *
 *  YAMA
 *    Zincirin başına, üst akımın sonradan eklediği korumanın aynısı
 *    ekleniyor: değer önceden tanımlıysa zincir hiç çalışmıyor.
 *    Değeri de hemen üstünde biz veriyoruz. Komut satırı bayrağına
 *    gerek kalmıyor; yama kendi kendine yeter.
 *
 *  NEDEN EKLENTİ, NEDEN PODS'A ELLE DOKUNMUYORUZ
 *    `ios/` dizini `expo prebuild` ile her koşumda yeniden üretiliyor ve
 *    Pods'u `pod install` indiriyor. Elle yamalanan dosya EAS'te yok.
 *    Bu yüzden yama Podfile'ın MEVCUT `post_install` kancasının içine
 *    enjekte ediliyor — CocoaPods ikinci bir `post_install` kabul
 *    etmiyor, o yüzden yeni hook AÇMIYORUZ.
 *
 *  SESSİZ BAŞARISIZLIK YOK
 *    Beklenen metin bulunamazsa yama sessizce atlanmıyor; `pod install`
 *    çıktısına uyarı basıyor. Sessizce atlanan yama, olmayan yamadır.
 * ===================================================================== */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RUBY = `
    # --- fmt × Xcode 26 (withFmtXcode26.js tarafından enjekte edildi) ---
    fmt_base = File.join(installer.sandbox.root.to_s, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      fmt_src = File.read(fmt_base)
      if fmt_src.include?('FMT_EXTERNAL_USE_CONSTEVAL')
        Pod::UI.puts '[fmt] yama zaten uygulanmis'
      else
        fmt_eski = "#if !defined(__cpp_lib_is_constant_evaluated)\\n#  define FMT_USE_CONSTEVAL 0"
        fmt_yeni = "#define FMT_EXTERNAL_USE_CONSTEVAL 1\\n" \\
                   "#define FMT_USE_CONSTEVAL 0\\n" \\
                   "#if defined(FMT_USE_CONSTEVAL)\\n" \\
                   "// Ustte verilen deger korunur; zincir calismaz.\\n" \\
                   "#elif !defined(__cpp_lib_is_constant_evaluated)\\n" \\
                   "#  define FMT_USE_CONSTEVAL 0"
        if fmt_src.include?(fmt_eski)
          File.write(fmt_base, fmt_src.sub(fmt_eski, fmt_yeni))
          Pod::UI.puts '[fmt] FMT_USE_CONSTEVAL 0 olarak sabitlendi (Xcode 26 consteval)'
        else
          Pod::UI.warn '[fmt] BEKLENEN METIN YOK - yama UYGULANMADI. fmt surumu degismis olabilir.'
        end
      end
    else
      Pod::UI.warn '[fmt] base.h bulunamadi: ' + fmt_base
    end
    # --- fmt yamasi sonu ---
`;

module.exports = function withFmtXcode26(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let src = fs.readFileSync(podfile, 'utf8');
      if (src.includes('withFmtXcode26.js tarafından enjekte edildi')) return cfg;

      const kanca = /post_install do \|installer\|\n/;
      if (!kanca.test(src)) {
        // Kanca yoksa sessizce geçmiyoruz: derleme yine düşer ve sebebi
        // görünmez olurdu.
        throw new Error(
          '[withFmtXcode26] Podfile içinde `post_install do |installer|` bulunamadı; ' +
            'yama enjekte edilemedi. CocoaPods ikinci bir post_install kabul etmediği ' +
            'için yeni hook açılmıyor.'
        );
      }
      src = src.replace(kanca, (m) => m + RUBY);
      fs.writeFileSync(podfile, src);
      return cfg;
    },
  ]);
};

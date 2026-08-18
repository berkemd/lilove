/**
 * LiLove · iOS izin metinlerini YERELLESTIR
 *
 * NEDEN: app.config.js'teki NS...UsageDescription metinleri TURKCE yazilmisti.
 * Bunlar kullaniciya iOS'un kendi uyarisinda gosterilir. Magaza varsayilan dili
 * en-US olan, yedi dilde satilan bir uygulamada Turkce izin metni hem kaliteyi
 * dusurur hem de App Review'da kafa karistirir.
 *
 * NE YAPAR: ios/<dil>.lproj/InfoPlist.strings dosyalarini uretir ve
 * CFBundleLocalizations'i yazar. Yeni npm bagimliligi YOK — yalniz
 * @expo/config-plugins (expo ile zaten gelir).
 *
 * DIKKAT: .lproj klasorlerini Xcode projesine EKLEMEZ; Expo prebuild ile
 * uretilen projede `ios/<slug>/` altina yazilir ve Resources'a kendiliginden
 * girer. Yazamazsa SESSIZ KALMAZ, hata firlatir.
 */
// OLCUM: kaynakta ne `Location.` ne `launchCameraAsync` geciyor. Uygulama
// NE KONUM NE KAMERA kullaniyor; yalniz fotograf KUTUPHANESINDEN secim var.
// Bu yuzden burada sadece NSPhotoLibraryUsageDescription tasiniyor ve
// kullanilmayan iki anahtar app.config.js'ten SILINIYOR (ek_duzeltmeler.py).
const { withDangerousMod, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const METINLER = {
  en: {
    NSPhotoLibraryUsageDescription: 'LiLove needs photo access so you can choose a profile picture.',
  },
  de: {
    NSPhotoLibraryUsageDescription: 'LiLove braucht Zugriff auf deine Fotos, damit du ein Profilbild wählen kannst.',
  },
  fr: {
    NSPhotoLibraryUsageDescription: 'LiLove a besoin de vos photos pour choisir une photo de profil.',
  },
  es: {
    NSPhotoLibraryUsageDescription: 'LiLove necesita acceso a tus fotos para elegir una foto de perfil.',
  },
  it: {
    NSPhotoLibraryUsageDescription: 'LiLove ha bisogno delle tue foto per scegliere una foto profilo.',
  },
  ja: {
    NSPhotoLibraryUsageDescription: 'プロフィール写真を選ぶために写真へのアクセスが必要です。',
  },
  tr: {
    NSPhotoLibraryUsageDescription: 'Profil fotoğrafı seçebilmen için galeri erişimi gerekir.',
  },
};
const DILLER = Object.keys(METINLER);

function kacir(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const withLproj = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosKok = cfg.modRequest.platformProjectRoot;
      if (!fs.existsSync(iosKok)) {
        throw new Error('[InfoPlistLocales] ios/ bulunamadi: ' + iosKok);
      }
      let yazilan = 0;
      for (const dil of DILLER) {
        const klasor = path.join(iosKok, `${dil}.lproj`);
        fs.mkdirSync(klasor, { recursive: true });
        const govde =
          '/* LiLove · uretilmistir, elle duzenleme */\n' +
          Object.entries(METINLER[dil])
            .map(([k, v]) => `"${k}" = "${kacir(v)}";`)
            .join('\n') + '\n';
        fs.writeFileSync(path.join(klasor, 'InfoPlist.strings'), govde, 'utf8');
        yazilan++;
      }
      if (yazilan !== DILLER.length) {
        throw new Error(`[InfoPlistLocales] ${DILLER.length} dil bekleniyordu, ${yazilan} yazildi`);
      }
      console.log(`[InfoPlistLocales] ${yazilan} dil icin InfoPlist.strings yazildi`);
      return cfg;
    },
  ]);

const withPlistAnahtarlari = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleLocalizations = DILLER;
    cfg.modResults.CFBundleDevelopmentRegion = 'en';
    cfg.modResults.CFBundleAllowMixedLocalizations = true;
    // Varsayilan (yedek) metinler INGILIZCE olsun — Turkce birakilmisti.
    for (const [k, v] of Object.entries(METINLER.en)) cfg.modResults[k] = v;
    return cfg;
  });

module.exports = (config) => withLproj(withPlistAnahtarlari(config));

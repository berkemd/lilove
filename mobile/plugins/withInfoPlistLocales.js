// Expo's locales mod writes the strings and adds every file to PBXResources.
const { withInfoPlist } = require('@expo/config-plugins');

const METINLER = {
  en: {
    NSPhotoLibraryUsageDescription:
      'LiLove needs photo access so you can choose a profile picture.',
  },
  de: {
    NSPhotoLibraryUsageDescription:
      'LiLove braucht Zugriff auf deine Fotos, damit du ein Profilbild wählen kannst.',
  },
  fr: {
    NSPhotoLibraryUsageDescription:
      'LiLove a besoin de vos photos pour choisir une photo de profil.',
  },
  es: {
    NSPhotoLibraryUsageDescription:
      'LiLove necesita acceso a tus fotos para elegir una foto de perfil.',
  },
  it: {
    NSPhotoLibraryUsageDescription:
      'LiLove ha bisogno delle tue foto per scegliere una foto profilo.',
  },
  ja: {
    NSPhotoLibraryUsageDescription: 'プロフィール写真を選ぶために写真へのアクセスが必要です。',
  },
  tr: {
    NSPhotoLibraryUsageDescription: 'Profil fotoğrafı seçebilmen için galeri erişimi gerekir.',
  },
};
const DILLER = Object.keys(METINLER);

module.exports = (config) => {
  config.locales = { ...config.locales, ...METINLER };
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleLocalizations = DILLER;
    cfg.modResults.CFBundleDevelopmentRegion = 'en';
    cfg.modResults.CFBundleAllowMixedLocalizations = true;
    Object.assign(cfg.modResults, METINLER.en);
    return cfg;
  });
};

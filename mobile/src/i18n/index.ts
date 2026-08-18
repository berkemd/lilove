// LiLove · arayuz dili
// Bagimliliksiz: yeni bir npm paketi YOK, yeni native modul YOK.
// Cihaz dilini React Native'in kendi kopruleriyle okur; okuyamazsa 'en'.
import { NativeModules, Platform } from 'react-native';
import { en } from './en';
import { de } from './de';
import { fr } from './fr';
import { es } from './es';
import { it } from './it';
import { ja } from './ja';
import { tr } from './tr';

const KATALOG = { en, de, fr, es, it, ja, tr } as const;
export type Dil = keyof typeof KATALOG;
export type Anahtar = keyof typeof en;

function hamDil(): string {
  try {
    if (Platform.OS === 'ios') {
      const s: any = NativeModules?.SettingsManager?.settings;
      const v = s?.AppleLocale || (Array.isArray(s?.AppleLanguages) ? s.AppleLanguages[0] : undefined);
      if (typeof v === 'string' && v) return v;
    } else {
      const v = NativeModules?.I18nManager?.localeIdentifier;
      if (typeof v === 'string' && v) return v;
    }
  } catch {}
  try {
    // Hermes'te Intl varsa son sans; yoksa sessizce 'en'.
    const v = (Intl as any)?.DateTimeFormat?.().resolvedOptions?.().locale;
    if (typeof v === 'string' && v) return v;
  } catch {}
  return 'en';
}

function coz(ham: string): Dil {
  const kok = ham.replace('_', '-').split('-')[0].toLowerCase();
  return (kok in KATALOG ? kok : 'en') as Dil;
}

export const dil: Dil = coz(hamDil());

/** Bir anahtari cevirir. Ceviri yoksa ingilizceye duser — asla bos donmez. */
export function t(k: Anahtar): string {
  const c: any = KATALOG[dil];
  const v = c?.[k];
  return (typeof v === 'string' && v.length > 0) ? v : (en as any)[k];
}

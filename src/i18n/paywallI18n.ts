import * as Localization from 'expo-localization';
import en from './locales/en/paywall.json';
import es from './locales/es/paywall.json';
import hi from './locales/hi/paywall.json';
import ar from './locales/ar/paywall.json';
import fr from './locales/fr/paywall.json';
import de from './locales/de/paywall.json';
import pt from './locales/pt/paywall.json';
import ru from './locales/ru/paywall.json';
import ja from './locales/ja/paywall.json';
import ko from './locales/ko/paywall.json';
import zh from './locales/zh/paywall.json';

export type PaywallStrings = typeof en;

const translations: Record<string, PaywallStrings> = {
  en,
  es,
  hi,
  ar,
  fr,
  de,
  pt,
  ru,
  ja,
  ko,
  zh,
};

export function getPaywallStrings(): PaywallStrings {
  const code = Localization.getLocales()[0]?.languageCode ?? 'en';
  // Match language code (e.g., 'en-US' -> 'en', 'zh-CN' -> 'zh')
  const lang = code.split('-')[0].toLowerCase();
  return translations[lang] ?? en;
}

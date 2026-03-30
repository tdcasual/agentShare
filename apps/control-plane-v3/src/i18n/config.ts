export type Locale = 'zh-CN' | 'en';

export const defaultLocale: Locale = 'zh-CN';

export const locales: Locale[] = ['zh-CN', 'en'];

export const localeLabels: Record<Locale, string> = {
  'zh-CN': '中文',
  'en': 'English',
};

export const localeFlags: Record<Locale, string> = {
  'zh-CN': '🇨🇳',
  'en': '🇺🇸',
};

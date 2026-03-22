export type Locale = "en" | "zh";

export const LOCALES: Locale[] = ["en", "zh"];
export const LOCALE_COOKIE_NAME = "acp_lang";

export function normalizeLocale(value: unknown): Locale | null {
  if (value === "en" || value === "zh") return value;
  return null;
}

export function tr(locale: Locale, en: string, zh: string) {
  return locale === "zh" ? zh : en;
}

export function otherLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

export function localeShortLabel(locale: Locale) {
  return locale === "zh" ? "中文" : "EN";
}

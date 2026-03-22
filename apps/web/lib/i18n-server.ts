import "server-only";

import { cookies, headers } from "next/headers";

import type { Locale } from "./i18n-shared";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "./i18n-shared";

function detectFromAcceptLanguage(headerValue: string | null): Locale | null {
  if (!headerValue) return null;
  // Cheap, robust detection: prefer zh if the user agent mentions it.
  const lowered = headerValue.toLowerCase();
  if (lowered.includes("zh")) return "zh";
  return null;
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const fromCookie = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  if (fromCookie) return fromCookie;

  const fromHeader = detectFromAcceptLanguage(headerStore.get("accept-language"));
  if (fromHeader) return fromHeader;

  return "en";
}

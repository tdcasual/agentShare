"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import type { Locale } from "../lib/i18n-shared";
import { LOCALE_COOKIE_NAME, localeShortLabel, otherLocale, tr } from "../lib/i18n-shared";

// Note: locale cookie is intentionally NOT httpOnly so client-side toggles work without extra routes.
export function LangToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const next = buildNextUrl(pathname, searchParams);
  const target = otherLocale(locale);

  return (
    <button
      type="button"
      className="secondary"
      aria-label={tr(locale, "Switch language", "切换语言")}
      disabled={pending}
      title={error ?? tr(locale, "Switch language", "切换语言")}
      onClick={() => {
        setError(null);
        startTransition(() => {
          try {
            // 1 year
            document.cookie = `${LOCALE_COOKIE_NAME}=${target}; Path=/; Max-Age=31536000; SameSite=Lax`;
            window.location.href = next;
          } catch {
            setError(tr(locale, "Unable to set language cookie.", "无法设置语言偏好。"));
          }
        });
      }}
    >
      {localeShortLabel(target)}
    </button>
  );
}

function buildNextUrl(pathname: string, searchParams: ReturnType<typeof useSearchParams>) {
  const query = searchParams?.toString() ?? "";
  return query ? `${pathname}?${query}` : pathname;
}

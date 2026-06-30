import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/components/i18n-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { RouteGuardWrapper } from '@/components/route-guard-wrapper';
import { defaultLocale, locales, type Locale } from '@/i18n/config';

// Load only the messages for the current locale at build time
import zhCN from '@/i18n/messages/zh-CN.json';
import en from '@/i18n/messages/en.json';

import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 不设置 maximumScale 以允许用户自由缩放（WCAG 2.1 要求允许缩放至 200%）
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

const rootLayoutMessages: Record<
  Locale,
  {
    common: { skipToContent: string };
    metadata: { appName: string; description: string; title: string };
  }
> = {
  'zh-CN': zhCN,
  en,
};

function resolveLayoutLocale(cookieLocale: string | undefined): Locale {
  return locales.includes(cookieLocale as Locale) ? (cookieLocale as Locale) : defaultLocale;
}

function getSkipLinkLabel(locale: Locale): string {
  return rootLayoutMessages[locale].common.skipToContent;
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLayoutLocale(cookieStore.get('app-locale')?.value);
  const localizedMetadata = rootLayoutMessages[locale].metadata;

  return {
    title: localizedMetadata.title,
    description: localizedMetadata.description,
    applicationName: localizedMetadata.appName,
    authors: [{ name: 'VaultGate' }],
    generator: 'Next.js',
    keywords: ['secrets', 'vault', 'tokens', 'management'],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = resolveLayoutLocale(cookieStore.get('app-locale')?.value);
  const skipLinkLabel = getSkipLinkLabel(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <I18nProvider initialLocale={locale}>
            <ErrorBoundary>
              <RouteGuardWrapper>
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-skip focus:rounded-xl focus:bg-[var(--kw-primary-500)] focus:px-4 focus:py-2 focus:text-white"
                >
                  {skipLinkLabel}
                </a>
                {children}
              </RouteGuardWrapper>
            </ErrorBoundary>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

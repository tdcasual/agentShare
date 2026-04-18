import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Nunito, Quicksand } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/components/i18n-provider';
import { RuntimeProvider } from '@/components/runtime-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { RouteGuardWrapper } from '@/components/route-guard-wrapper';
import { KawaiiBackground } from '@/components/kawaii/kawaii-background';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { PWAInstallPrompt } from '@/components/pwa/pwa-install-prompt';
import { PWAUpdatePrompt, PWAOfflineIndicator } from '@/components/pwa/pwa-update-prompt';
import { defaultLocale, locales, type Locale } from '@/i18n/config';
import zhCN from '@/i18n/messages/zh-CN.json';
import en from '@/i18n/messages/en.json';

import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 不设置 maximumScale 以允许用户自由缩放（WCAG 2.1 要求允许缩放至 200%）
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF5F7' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1A2E' },
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
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
        { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
        { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
        { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
        { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
        { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
        { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: localizedMetadata.appName,
      startupImage: [{ url: '/icons/icon-512x512.png', media: '(device-width: 768px)' }],
    },
    applicationName: localizedMetadata.appName,
    authors: [{ name: 'Agent Control Plane Team' }],
    generator: 'Next.js',
    keywords: ['PWA', 'control plane', 'agents', 'management', 'offline'],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = resolveLayoutLocale(cookieStore.get('app-locale')?.value);
  const skipLinkLabel = getSkipLinkLabel(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${nunito.variable} ${quicksand.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <I18nProvider initialLocale={locale}>
            <RuntimeProvider>
              <ErrorBoundary>
                <RouteGuardWrapper>
                  <KawaiiBackground />
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-skip focus:rounded-xl focus:bg-[var(--kw-primary-500)] focus:px-4 focus:py-2 focus:text-white"
                  >
                    {skipLinkLabel}
                  </a>
                  {children}
                  <ServiceWorkerRegister />
                  <PWAInstallPrompt />
                  <PWAUpdatePrompt />
                  <PWAOfflineIndicator />
                </RouteGuardWrapper>
              </ErrorBoundary>
            </RuntimeProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

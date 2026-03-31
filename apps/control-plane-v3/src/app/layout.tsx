import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/components/i18n-provider';
import { RuntimeProvider } from '@/components/runtime-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { KawaiiBackground } from '@/components/kawaii/kawaii-background';
import { ServiceWorkerRegister } from '@/components/service-worker-register';

import './globals.css';

export const metadata: Metadata = {
  title: 'Control Plane V3 - 双生宇宙',
  description: '人类与智能体共享的控制平面',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Control Plane',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF5F7' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1A2E' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <I18nProvider>
            <RuntimeProvider>
              <ErrorBoundary>
                <KawaiiBackground />
                <a 
                  href="#main-content" 
                  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-pink-500 focus:text-white focus:rounded-xl"
                >
                  跳转到主要内容
                </a>
                <div id="main-content">{children}</div>
                <ServiceWorkerRegister />
              </ErrorBoundary>
            </RuntimeProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/components/i18n-provider';
import { RuntimeProvider } from '@/components/runtime-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { KawaiiBackground } from '@/components/kawaii/kawaii-background';
import './globals.css';

export const metadata: Metadata = {
  title: 'Control Plane V3 - 双生宇宙',
  description: '人类与智能体共享的控制平面',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
                {children}
              </ErrorBoundary>
            </RuntimeProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

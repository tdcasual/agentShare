import type { Metadata } from 'next';
import './globals.css';
import { KawaiiBackground } from '@/components/kawaii/kawaii-background';

export const metadata: Metadata = {
  title: 'Control Plane V3 - Dual Cosmos',
  description: 'Human and Agent shared control plane',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <KawaiiBackground />
        {children}
      </body>
    </html>
  );
}

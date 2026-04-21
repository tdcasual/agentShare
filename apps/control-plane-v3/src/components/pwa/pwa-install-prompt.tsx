'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { Download, X, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

interface PWAInstallPromptProps {
  className?: string;
  // 延迟显示（毫秒）
  delay?: number;
  // 最小访问次数才显示
  minVisits?: number;
}

const STORAGE_KEY = 'pwa-install-dismissed';
const VISIT_KEY = 'pwa-visit-count';

export function PWAInstallPrompt({
  className,
  delay = 5000,
  minVisits = 2,
}: PWAInstallPromptProps) {
  const { t } = useI18n();
  const { isInstallable, isInstalled, install } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const expiry = parseInt(dismissed, 10);
      if (Number.isFinite(expiry) && Date.now() <= expiry) {
        setIsDismissed(true);
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
    }

    setIsDismissed(false);

    // 增加访问计数
    const visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
    localStorage.setItem(VISIT_KEY, String(visits + 1));

    // 检查是否达到最小访问次数
    if (visits + 1 < minVisits) {
      return;
    }

    // 延迟显示
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, delay, minVisits]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // 记住用户的选择（7天）
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(expiry));
  };

  const handleInstall = async () => {
    await install();
    setIsVisible(false);
  };

  if (!isVisible || isDismissed || !isInstallable || isInstalled) {
    return null;
  }

  return (
    <Card
      className={cn(
        'fixed bottom-24 left-4 right-4 z-toast md:left-auto md:right-4 md:w-96',
        'animate-slide-up shadow-xl',
        className
      )}
    >
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--kw-primary-500)]">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--kw-text)]">{t('pwa.installTitle')}</h3>
            <p className="mt-1 text-sm text-[var(--kw-text-muted)]">{t('pwa.installDesc')}</p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1 transition-colors hover:bg-[var(--kw-surface-alt)] dark:hover:bg-[var(--kw-dark-surface-alt)]"
            aria-label={t('pwa.dismiss')}
          >
            <X className="h-5 w-5 text-[var(--kw-text-muted)]" />
          </button>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="flex-1">
            {t('pwa.later')}
          </Button>
          <Button
            size="sm"
            onClick={handleInstall}
            className="flex-1"
            leftIcon={<Download className="h-4 w-4" />}
          >
            {t('pwa.install')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// 简化的安装按钮（用于设置页面）
export function PWAInstallButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const { isInstallable, isInstalled, install } = usePWA();

  if (!isInstallable || isInstalled) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      onClick={install}
      leftIcon={<Download className="h-4 w-4" />}
      className={className}
    >
      {t('pwa.installApp')}
    </Button>
  );
}

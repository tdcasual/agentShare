'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { Download, X, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  minVisits = 2 
}: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, install } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 检查是否已经忽略过
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

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

  // 检查是否过期
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const expiry = parseInt(dismissed, 10);
      if (Date.now() > expiry) {
        localStorage.removeItem(STORAGE_KEY);
        setIsDismissed(false);
      }
    }
  }, []);

  if (!isVisible || isDismissed || !isInstallable || isInstalled) {
    return null;
  }

  return (
    <Card 
      className={cn(
        'fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50',
        'animate-slide-up shadow-xl',
        className
      )}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">
              安装 Control Plane
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF] mt-1">
              添加到主屏幕，像原生应用一样快速访问，支持离线使用
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3D3D5C] transition-colors"
            aria-label="忽略"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
          >
            稍后
          </Button>
          <Button
            size="sm"
            onClick={handleInstall}
            className="flex-1"
            leftIcon={<Download className="w-4 h-4" />}
          >
            安装
          </Button>
        </div>
      </div>
    </Card>
  );
}

// 简化的安装按钮（用于设置页面）
export function PWAInstallButton({ className }: { className?: string }) {
  const { isInstallable, isInstalled, install } = usePWA();

  if (!isInstallable || isInstalled) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      onClick={install}
      leftIcon={<Download className="w-4 h-4" />}
      className={className}
    >
      安装应用
    </Button>
  );
}

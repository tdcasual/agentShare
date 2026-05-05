/**
 * 离线页面 (Kawaii 版)
 *
 * 当用户处于离线状态且请求的内容不在缓存中时显示
 */

'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, CloudOff, FileText, FolderOpen, RefreshCw, Settings } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/shared/ui-primitives/button';

export default function OfflinePage() {
  const { t } = useI18n();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-[var(--kw-bg)] p-4 dark:bg-[var(--kw-dark-bg)]"
    >
      <div className="w-full max-w-md space-y-3 p-8 text-center sm:space-y-4 lg:space-y-6">
        {/* 图标 */}
        <div
          className="dark:bg-[var(--kw-dark-amber-surface)]/30 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--kw-amber-surface)]"
          aria-hidden="true"
        >
          <CloudOff className="h-10 w-10 text-[var(--kw-amber-text)]" />
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--kw-text)] sm:text-2xl">
            {t('offline.title')}
          </h1>
          <p className="text-[var(--kw-text-muted)]">{t('offline.description')}</p>
        </div>

        {/* 说明 */}
        <div className="dark:bg-[var(--kw-dark-surface)]/50 space-y-3 rounded-xl bg-[var(--kw-surface)]/50 p-3 text-left sm:p-4">
          <div className="flex items-start gap-3">
            <FolderOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--kw-text-muted)]" aria-hidden="true" />
            <div>
              <p className="font-medium text-[var(--kw-text)]">
                {t('offline.availableFeaturesTitle')}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-[var(--kw-text-muted)]">
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t('offline.cachedPages')}
                </li>
                <li className="flex items-center gap-2">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  {t('offline.localData')}
                </li>
                <li className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t('offline.formsSync')}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.history.back()} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('common.back')}
          </Button>
          <Button onClick={handleRetry} disabled={!isOnline} loading={isOnline} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('common.retry')}
          </Button>
        </div>

        {/* 状态提示 */}
        {isOnline && (
          <p className="flex items-center justify-center gap-2 animate-fade-in text-sm text-[var(--kw-green-text)] dark:text-[var(--kw-dark-mint)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t('offline.backOnline')}
          </p>
        )}

        {/* 底部信息 */}
        <p className="text-xs text-[var(--kw-text-muted)]">
          Control Plane V3 · {t('common.offline')}
        </p>
      </div>
    </main>
  );
}

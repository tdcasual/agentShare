/**
 * 离线页面 (Kawaii 版)
 *
 * 当用户处于离线状态且请求的内容不在缓存中时显示
 */

'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/shared/ui-primitives/button';
import { emojiCombo, emoji } from '@/lib/kawaii-emojis';

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
          className="dark:bg-[var(--kw-dark-amber-surface)]/30 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--kw-amber-surface)] text-4xl"
          aria-hidden="true"
        >
          {emojiCombo('offline', 1)}
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--kw-text)] sm:text-2xl">
            {emoji('offline')} {t('offline.title')}
          </h1>
          <p className="text-[var(--kw-text-muted)]">{t('offline.description')}</p>
        </div>

        {/* 说明 */}
        <div className="dark:bg-[var(--kw-dark-surface)]/50 space-y-3 rounded-xl bg-[var(--kw-surface)]/50 p-3 text-left sm:p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex-shrink-0 text-lg">{emoji('empty')}</span>
            <div>
              <p className="font-medium text-[var(--kw-text)]">
                {t('offline.availableFeaturesTitle')}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-[var(--kw-text-muted)]">
                <li>
                  • {emoji('docs')} {t('offline.cachedPages')}
                </li>
                <li>
                  • {emoji('settings')} {t('offline.localData')}
                </li>
                <li>
                  • {emoji('sync')} {t('offline.formsSync')}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.history.back()} className="flex-1">
            {emoji('back')} {t('common.back')}
          </Button>
          <Button onClick={handleRetry} disabled={!isOnline} loading={isOnline} className="flex-1">
            {emoji('refresh')} {t('common.retry')}
          </Button>
        </div>

        {/* 状态提示 */}
        {isOnline && (
          <p className="animate-fade-in text-sm text-[var(--kw-green-text)] dark:text-[var(--kw-dark-mint)]">
            {emoji('success')} {t('offline.backOnline')}
          </p>
        )}

        {/* 底部信息 */}
        <p className="text-xs text-[var(--kw-text-muted)]">
          {emoji('cosmos')} Control Plane V3 · {t('common.offline')}
        </p>
      </div>
    </main>
  );
}

'use client';

import { usePWA, shareContent, vibrateFeedback } from '@/hooks/use-pwa';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import {
  Download,
  Check,
  WifiOff,
  Wifi,
  Share2,
  Smartphone,
  Vibrate,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

interface PWAStatusProps {
  className?: string;
}

export function PWAStatus({ className }: PWAStatusProps) {
  const { t } = useI18n();
  const {
    isInstallable,
    isInstalled,
    isOffline,
    canShare,
    canVibrate,
    hasUpdate,
    install,
    update,
  } = usePWA();

  const handleShare = async () => {
    try {
      await shareContent({
        title: 'Control Plane V3',
        text: t('metadata.description'),
        url: window.location.origin,
      });
    } catch {
      // share failed or user cancelled
    }
  };

  const handleVibrate = () => {
    vibrateFeedback([50, 100, 50]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 安装状态 */}
      <Card className="p-4">
        <h3 className="mb-4 font-semibold text-[var(--kw-text)]">{t('pwa.appStatus')}</h3>
        <div className="space-y-3">
          {/* 安装状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  isInstalled ? 'bg-[var(--kw-green-surface)] dark:bg-[var(--kw-dark-success-surface)]/30' : 'bg-[var(--kw-surface-alt)] dark:bg-[var(--kw-dark-surface-alt)]'
                )}
              >
                {isInstalled ? (
                  <Smartphone className="h-5 w-5 text-[var(--kw-green-text)]" />
                ) : (
                  <Download className="h-5 w-5 text-[var(--kw-text-muted)]" />
                )}
              </div>
              <div>
                <p className="font-medium text-[var(--kw-text)]">
                  {isInstalled ? t('pwa.installed') : t('pwa.notInstalled')}
                </p>
                <p className="text-sm text-[var(--kw-text-muted)]">
                  {isInstalled ? t('pwa.addedToHomeScreen') : t('pwa.addToHomeScreen')}
                </p>
              </div>
            </div>
            {!isInstalled && isInstallable && (
              <Button size="sm" onClick={install}>
                {t('pwa.install')}
              </Button>
            )}
          </div>

          {/* 网络状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  isOffline
                    ? 'bg-[var(--kw-amber-surface)] dark:bg-[var(--kw-dark-amber-surface)]/30'
                    : 'bg-[var(--kw-green-surface)] dark:bg-[var(--kw-dark-success-surface)]/30'
                )}
              >
                {isOffline ? (
                  <WifiOff className="h-5 w-5 text-[var(--kw-amber-text)]" />
                ) : (
                  <Wifi className="h-5 w-5 text-[var(--kw-green-text)]" />
                )}
              </div>
              <div>
                <p className="font-medium text-[var(--kw-text)]">
                  {isOffline ? t('pwa.offline') : t('pwa.online')}
                </p>
                <p className="text-sm text-[var(--kw-text-muted)]">
                  {isOffline ? t('pwa.offlineDesc') : t('pwa.allFeaturesAvailable')}
                </p>
              </div>
            </div>
          </div>

          {/* 更新状态 */}
          {hasUpdate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kw-primary-100)] dark:bg-[var(--kw-dark-pink-surface)]">
                  <RefreshCw className="h-5 w-5 text-[var(--kw-primary-500)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--kw-text)]">{t('pwa.updateAvailable')}</p>
                  <p className="text-sm text-[var(--kw-text-muted)]">{t('pwa.updateDesc')}</p>
                </div>
              </div>
              <Button size="sm" onClick={update}>
                {t('pwa.update')}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 功能支持 */}
      <Card className="p-4">
        <h3 className="mb-4 font-semibold text-[var(--kw-text)]">{t('pwa.deviceFeatures')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* 分享功能 */}
          <button
            type="button"
            onClick={handleShare}
            disabled={!canShare}
            className={cn(
              'flex items-center gap-3 rounded-xl p-3 text-left transition-colors',
              canShare
                ? 'cursor-pointer hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-border)]'
                : 'cursor-not-allowed opacity-50'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                canShare ? 'bg-[var(--kw-sky-surface)] dark:bg-[var(--kw-dark-info-surface)]/30' : 'bg-[var(--kw-surface-alt)] dark:bg-[var(--kw-dark-surface-alt)]'
              )}
            >
              <Share2 className={cn('h-5 w-5', canShare ? 'text-[var(--kw-sky-text)]' : 'text-[var(--kw-text-muted)]')} />
            </div>
            <div>
              <p className="font-medium text-[var(--kw-text)]">{t('common.share')}</p>
              <p className="text-xs text-[var(--kw-text-muted)]">
                {canShare ? t('pwa.available') : t('pwa.unsupported')}
              </p>
            </div>
          </button>

          {/* 振动反馈 */}
          <button
            type="button"
            onClick={handleVibrate}
            disabled={!canVibrate}
            className={cn(
              'flex items-center gap-3 rounded-xl p-3 text-left transition-colors',
              canVibrate
                ? 'cursor-pointer hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-border)]'
                : 'cursor-not-allowed opacity-50'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                canVibrate ? 'bg-[var(--kw-purple-surface)] dark:bg-[var(--kw-dark-purple-surface)]/30' : 'bg-[var(--kw-surface-alt)] dark:bg-[var(--kw-dark-surface-alt)]'
              )}
            >
              <Vibrate
                className={cn('h-5 w-5', canVibrate ? 'text-[var(--kw-purple-text)]' : 'text-[var(--kw-text-muted)]')}
              />
            </div>
            <div>
              <p className="font-medium text-[var(--kw-text)]">{t('pwa.vibrate')}</p>
              <p className="text-xs text-[var(--kw-text-muted)]">
                {canVibrate ? t('pwa.available') : t('pwa.unsupported')}
              </p>
            </div>
          </button>
        </div>
      </Card>

      {/* 功能清单 */}
      <Card className="p-4">
        <h3 className="mb-4 font-semibold text-[var(--kw-text)]">{t('pwa.pwaFeatures')}</h3>
        <ul className="space-y-2">
          <FeatureItem label={t('pwa.featureOffline')} description={t('pwa.featureOfflineDesc')} available={true} />
          <FeatureItem label={t('pwa.featureSync')} description={t('pwa.featureSyncDesc')} available={true} />
          <FeatureItem label={t('pwa.featurePush')} description={t('pwa.featurePushDesc')} available={true} />
          <FeatureItem
            label={t('pwa.featureA2hs')}
            description={t('pwa.featureA2hsDesc')}
            available={isInstallable || isInstalled}
          />
          <FeatureItem label={t('pwa.featureAutoUpdate')} description={t('pwa.featureAutoUpdateDesc')} available={true} />
        </ul>
      </Card>
    </div>
  );
}

function FeatureItem({
  label,
  description,
  available,
}: {
  label: string;
  description: string;
  available: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <div
        className={cn(
          'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
          available ? 'bg-[var(--kw-green-surface)] dark:bg-[var(--kw-dark-success-surface)]/30' : 'bg-[var(--kw-surface-alt)] dark:bg-[var(--kw-dark-surface-alt)]'
        )}
      >
        {available ? (
          <Check className={cn('h-3 w-3', available ? 'text-[var(--kw-green-text)]' : 'text-[var(--kw-text-muted)]')} />
        ) : (
          <span className="h-3 w-3 rounded-full bg-[var(--kw-text-muted)] dark:bg-[var(--kw-dark-text-muted)]" />
        )}
      </div>
      <div>
        <p
          className={cn(
            'font-medium',
            available ? 'text-[var(--kw-text)]' : 'text-[var(--kw-text-muted)]'
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            'text-sm',
            available ? 'text-[var(--kw-text-muted)]' : 'text-[var(--kw-text-muted)]'
          )}
        >
          {description}
        </p>
      </div>
    </li>
  );
}

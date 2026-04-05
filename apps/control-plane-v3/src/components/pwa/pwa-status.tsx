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
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PWAStatusProps {
  className?: string;
}

export function PWAStatus({ className }: PWAStatusProps) {
  const { 
    isInstallable, 
    isInstalled, 
    isOffline, 
    canShare, 
    canVibrate,
    hasUpdate,
    install,
    update
  } = usePWA();

  const handleShare = async () => {
    try {
      await shareContent({
        title: 'Control Plane V3',
        text: '人类与智能体共享的控制平面',
        url: window.location.origin,
      });
    } catch {
      // 分享失败或用户取消
    }
  };

  const handleVibrate = () => {
    vibrateFeedback([50, 100, 50]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 安装状态 */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC] mb-4">
          应用状态
        </h3>
        <div className="space-y-3">
          {/* 安装状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                isInstalled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
              )}>
                {isInstalled ? (
                  <Smartphone className="w-5 h-5 text-green-600" />
                ) : (
                  <Download className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                  {isInstalled ? '已安装' : '未安装'}
                </p>
                <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                  {isInstalled 
                    ? '应用已添加到主屏幕' 
                    : '添加到主屏幕以获得更好体验'}
                </p>
              </div>
            </div>
            {!isInstalled && isInstallable && (
              <Button size="sm" onClick={install}>
                安装
              </Button>
            )}
          </div>

          {/* 网络状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                isOffline ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'
              )}>
                {isOffline ? (
                  <WifiOff className="w-5 h-5 text-amber-600" />
                ) : (
                  <Wifi className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                  {isOffline ? '离线模式' : '在线'}
                </p>
                <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                  {isOffline 
                    ? '部分内容可能无法访问' 
                    : '所有功能可用'}
                </p>
              </div>
            </div>
          </div>

          {/* 更新状态 */}
          {hasUpdate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                    新版本可用
                  </p>
                  <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                    更新包含新功能和改进
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={update}>
                更新
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 功能支持 */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC] mb-4">
          设备功能
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* 分享功能 */}
          <button
            onClick={handleShare}
            disabled={!canShare}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
              canShare 
                ? 'hover:bg-pink-50 dark:hover:bg-[#3D3D5C] cursor-pointer' 
                : 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              canShare ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'
            )}>
              <Share2 className={cn('w-5 h-5', canShare ? 'text-blue-600' : 'text-gray-400')} />
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                分享
              </p>
              <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                {canShare ? '可用' : '不支持'}
              </p>
            </div>
          </button>

          {/* 振动反馈 */}
          <button
            onClick={handleVibrate}
            disabled={!canVibrate}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
              canVibrate 
                ? 'hover:bg-pink-50 dark:hover:bg-[#3D3D5C] cursor-pointer' 
                : 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              canVibrate ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-800'
            )}>
              <Vibrate className={cn('w-5 h-5', canVibrate ? 'text-purple-600' : 'text-gray-400')} />
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                振动
              </p>
              <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                {canVibrate ? '可用' : '不支持'}
              </p>
            </div>
          </button>
        </div>
      </Card>

      {/* 功能清单 */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC] mb-4">
          PWA 功能
        </h3>
        <ul className="space-y-2">
          <FeatureItem 
            label="离线访问" 
            description="无网络时仍可浏览缓存内容"
            available={true} 
          />
          <FeatureItem 
            label="后台同步" 
            description="网络恢复时自动同步数据"
            available={true} 
          />
          <FeatureItem 
            label="推送通知" 
            description="接收重要事件提醒"
            available={true} 
          />
          <FeatureItem 
            label="添加到主屏幕" 
            description="像原生应用一样启动"
            available={isInstallable || isInstalled} 
          />
          <FeatureItem 
            label="自动更新" 
            description="始终保持最新版本"
            available={true} 
          />
        </ul>
      </Card>
    </div>
  );
}

function FeatureItem({ 
  label, 
  description, 
  available 
}: { 
  label: string; 
  description: string; 
  available: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        available ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
      )}>
        {available ? (
          <Check className={cn('w-3 h-3', available ? 'text-green-600' : 'text-gray-400')} />
        ) : (
          <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
      </div>
      <div>
        <p className={cn(
          'font-medium',
          available ? 'text-gray-800 dark:text-[#E8E8EC]' : 'text-gray-400 dark:text-gray-600'
        )}>
          {label}
        </p>
        <p className={cn(
          'text-sm',
          available ? 'text-gray-500 dark:text-[#9CA3AF]' : 'text-gray-400 dark:text-gray-600'
        )}>
          {description}
        </p>
      </div>
    </li>
  );
}

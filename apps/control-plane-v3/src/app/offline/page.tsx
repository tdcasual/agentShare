/**
 * 离线页面
 *
 * 当用户处于离线状态且请求的内容不在缓存中时显示
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // 检查网络状态
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // 网络恢复时自动刷新
      window.location.reload();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--kw-primary-50)] to-[var(--kw-purple-surface)] p-4 dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
      <Card variant="feature" className="w-full max-w-md space-y-6 p-8 text-center">
        {/* 图标 */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--kw-amber-surface)] dark:bg-[var(--kw-dark-amber-surface)]/30">
          <WifiOff className="h-10 w-10 text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]" />
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--kw-text)]">您已离线</h1>
          <p className="text-[var(--kw-text-muted)]">无法连接到网络，部分功能可能无法使用</p>
        </div>

        {/* 说明 */}
        <div className="space-y-3 rounded-2xl bg-white/50 p-4 text-left dark:bg-[var(--kw-dark-surface)]/50">
          <div className="flex items-start gap-3">
            <CloudOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--kw-text-muted)]" />
            <div>
              <p className="font-medium text-[var(--kw-text)]">离线时可用的功能</p>
              <ul className="mt-1 space-y-1 text-sm text-[var(--kw-text-muted)]">
                <li>• 浏览已缓存的页面</li>
                <li>• 查看本地数据</li>
                <li>• 填写表单（稍后同步）</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.history.back()} className="flex-1">
            返回
          </Button>
          <Button
            onClick={handleRetry}
            disabled={!isOnline}
            loading={isOnline}
            className="flex-1"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            重试
          </Button>
        </div>

        {/* 状态提示 */}
        {isOnline && (
          <p className="animate-fade-in text-sm text-[var(--kw-green-text)] dark:text-[var(--kw-dark-mint)]">
            网络已恢复，正在重新加载...
          </p>
        )}

        {/* 底部信息 */}
        <p className="text-xs text-[var(--kw-text-muted)]">Control Plane V3 · 离线模式</p>
      </Card>
    </div>
  );
}

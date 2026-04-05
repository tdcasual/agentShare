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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-[#1A1A2E] dark:to-[#252540]">
      <Card 
        variant="feature" 
        className="max-w-md w-full text-center p-8 space-y-6"
      >
        {/* 图标 */}
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-[#E8E8EC]">
            您已离线
          </h1>
          <p className="text-gray-600 dark:text-[#9CA3AF]">
            无法连接到网络，部分功能可能无法使用
          </p>
        </div>

        {/* 说明 */}
        <div className="bg-white/50 dark:bg-[#252540]/50 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-start gap-3">
            <CloudOff className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                离线时可用的功能
              </p>
              <ul className="text-sm text-gray-500 dark:text-[#9CA3AF] mt-1 space-y-1">
                <li>• 浏览已缓存的页面</li>
                <li>• 查看本地数据</li>
                <li>• 填写表单（稍后同步）</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => window.history.back()}
            className="flex-1"
          >
            返回
          </Button>
          <Button
            onClick={handleRetry}
            disabled={!isOnline}
            loading={isOnline}
            className="flex-1"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            重试
          </Button>
        </div>

        {/* 状态提示 */}
        {isOnline && (
          <p className="text-sm text-green-600 dark:text-green-400 animate-fade-in">
            网络已恢复，正在重新加载...
          </p>
        )}

        {/* 底部信息 */}
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Control Plane V3 · 离线模式
        </p>
      </Card>
    </div>
  );
}

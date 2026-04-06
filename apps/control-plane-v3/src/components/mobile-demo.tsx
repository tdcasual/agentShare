'use client';

import { useState } from 'react';
import { Plus, Search, Settings, User, Bell } from 'lucide-react';
import { MobileFab } from './mobile-fab';
import { MobileBottomSheet, MobileActionSheet } from './mobile-bottom-sheet';
import { useIsMobile } from '@/hooks/use-media-query';

// 这个组件仅用于演示移动端功能
export function MobileDemo() {
  const isMobile = useIsMobile();
  const [showSheet, setShowSheet] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  if (!isMobile) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>请在移动端设备上查看演示</p>
        <p className="mt-2 text-sm">或使用浏览器开发者工具的移动端模拟</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-lg font-semibold">移动端组件演示</h2>

      {/* FAB 演示 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-600">浮动操作按钮</h3>
        <p className="text-sm text-gray-500">右下角会显示 FAB 按钮</p>
      </div>

      {/* 底部面板演示 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-600">底部面板</h3>
        <button
          onClick={() => setShowSheet(true)}
          className="rounded-lg bg-pink-500 px-4 py-2 text-sm text-white"
        >
          打开底部面板
        </button>
      </div>

      {/* 操作菜单演示 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-600">操作菜单</h3>
        <button
          onClick={() => setShowActionSheet(true)}
          className="rounded-lg bg-pink-500 px-4 py-2 text-sm text-white"
        >
          打开操作菜单
        </button>
      </div>

      {/* 浮动操作按钮 */}
      <MobileFab
        actions={[
          {
            icon: <User className="h-5 w-5" />,
            label: '个人资料',
            onClick: () => alert('Profile clicked (demo)'),
            variant: 'secondary',
          },
          {
            icon: <Settings className="h-5 w-5" />,
            label: '设置',
            onClick: () => alert('Settings clicked (demo)'),
            variant: 'secondary',
          },
          {
            icon: <Bell className="h-5 w-5" />,
            label: '通知',
            onClick: () => alert('Notifications clicked (demo)'),
            variant: 'secondary',
          },
        ]}
      />

      {/* 底部面板 */}
      <MobileBottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="示例面板">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-[#9CA3AF]">这是一个移动端底部面板示例。</p>
          <p className="text-gray-600 dark:text-[#9CA3AF]">特性：</p>
          <ul className="list-inside list-disc space-y-1 text-gray-600 dark:text-[#9CA3AF]">
            <li>支持向下滑动关闭</li>
            <li>焦点自动管理</li>
            <li>安全区域适配</li>
            <li>平滑动画</li>
          </ul>
        </div>
      </MobileBottomSheet>

      {/* 操作菜单 */}
      <MobileActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        actions={[
          {
            label: '查看详情',
            onClick: () => alert('View details (demo)'),
            icon: <Search className="h-5 w-5" />,
          },
          {
            label: '编辑',
            onClick: () => alert('Edit clicked (demo)'),
            icon: <Settings className="h-5 w-5" />,
            variant: 'primary',
          },
          {
            label: '删除',
            onClick: () => alert('Delete clicked (demo)'),
            icon: <Plus className="h-5 w-5" />,
            variant: 'danger',
          },
        ]}
      />
    </div>
  );
}

'use client';

import { useFocusTrap } from '@/hooks/use-focus-trap';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useCallback, useRef } from 'react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
}: MobileBottomSheetProps) {
  const { containerRef } = useFocusTrap({ isActive: isOpen, onEscape: onClose });
  const startY = useRef(0);
  const currentY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // 处理滑动手势关闭
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // 只有在拖动指示器或头部时才启动拖动
    const target = e.target as HTMLElement;
    const isHandle = target.closest('[data-sheet-handle]');
    
    if (isHandle || !contentRef.current?.contains(target)) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) {return;}
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0 && sheetRef.current) {
      // 向下滑动时添加阻力
      const resistance = 0.5;
      sheetRef.current.style.transform = `translateY(${diff * resistance}px)`;
      // 阻止默认滚动行为
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) {return;}
    
    isDragging.current = false;
    const diff = currentY.current - startY.current;
    
    if (sheetRef.current) {
      if (diff > 100) {
        // 滑动超过阈值，关闭
        onClose();
      } else {
        // 回弹
        sheetRef.current.style.transform = '';
      }
    }
  }, [onClose]);

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bottom-sheet-title' : undefined}
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 底部面板 */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0',
          'bg-white dark:bg-[#252540]',
          'rounded-t-3xl',
          'shadow-2xl',
          'transition-transform duration-300 ease-out',
          'animate-slide-up',
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 拖动指示器 */}
        <div 
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          data-sheet-handle
        >
          <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-[#3D3D5C]" />
        </div>
        
        {/* 头部 */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-pink-100 dark:border-[#3D3D5C]">
            <h2 
              id="bottom-sheet-title" 
              className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-pink-50 dark:hover:bg-[#3D3D5C] transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-[#9CA3AF]" />
            </button>
          </div>
        )}
        
        {/* 内容区域 */}
        <div 
          ref={contentRef}
          className="p-4 max-h-[70vh] overflow-y-auto touch-pan-y"
        >
          {children}
        </div>
        
        {/* 安全区域 */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

// 移动端操作菜单
interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actions: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'primary';
    icon?: React.ReactNode;
  }[];
}

export function MobileActionSheet({ isOpen, onClose, actions }: MobileActionSheetProps) {
  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors',
              action.variant === 'danger' && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
              action.variant === 'primary' && 'text-pink-600 dark:text-[#E891C0] hover:bg-pink-50 dark:hover:bg-[#3D3D5C]',
              (!action.variant || action.variant === 'default') && 'text-gray-700 dark:text-[#E8E8EC] hover:bg-pink-50 dark:hover:bg-[#3D3D5C]'
            )}
          >
            {action.icon}
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
        
        <hr className="my-3 border-pink-100 dark:border-[#3D3D5C]" />
        
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-medium text-gray-500 dark:text-[#9CA3AF] hover:bg-gray-100 dark:hover:bg-[#3D3D5C] transition-colors"
        >
          取消
        </button>
      </div>
    </MobileBottomSheet>
  );
}

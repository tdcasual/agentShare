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
    if (!isDragging.current) {
      return;
    }

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
    if (!isDragging.current) {
      return;
    }

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
          'bg-[var(--kw-surface)] dark:bg-[var(--kw-dark-surface)]',
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
          className="flex cursor-grab justify-center pb-2 pt-3 active:cursor-grabbing"
          data-sheet-handle
        >
          <div className="h-1.5 w-12 rounded-full bg-[var(--kw-text-muted)] dark:bg-[var(--kw-dark-border)]" />
        </div>

        {/* 头部 */}
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--kw-border)] px-4 pb-3 dark:border-[var(--kw-dark-border)]">
            <h2 id="bottom-sheet-title" className="text-lg font-semibold text-[var(--kw-text)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-border)]"
              aria-label="关闭"
            >
              <X className="h-5 w-5 text-[var(--kw-text-muted)]" />
            </button>
          </div>
        )}

        {/* 内容区域 */}
        <div ref={contentRef} className="max-h-[70vh] touch-pan-y overflow-y-auto p-4">
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
            type="button"
            key={index}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition-colors',
              action.variant === 'danger' &&
                'dark:hover:bg-[var(--kw-dark-error-surface)]/20 text-[var(--kw-error)] hover:bg-[var(--kw-rose-surface)] dark:text-[var(--kw-error)]',
              action.variant === 'primary' &&
                'text-[var(--kw-primary-600)] hover:bg-[var(--kw-primary-50)] dark:text-[var(--kw-dark-primary)] dark:hover:bg-[var(--kw-dark-border)]',
              (!action.variant || action.variant === 'default') &&
                'text-[var(--kw-text)] hover:bg-[var(--kw-primary-50)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-border)]'
            )}
          >
            {action.icon}
            <span className="font-medium">{action.label}</span>
          </button>
        ))}

        <hr className="my-3 border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]" />

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl py-3 font-medium text-[var(--kw-text-muted)] transition-colors hover:bg-[var(--kw-surface-alt)] dark:text-[var(--kw-dark-text-muted)] dark:hover:bg-[var(--kw-dark-border)]"
        >
          取消
        </button>
      </div>
    </MobileBottomSheet>
  );
}

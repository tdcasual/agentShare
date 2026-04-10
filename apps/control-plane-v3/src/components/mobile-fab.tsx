'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';

interface FabAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface MobileFabProps {
  actions?: FabAction[];
  onMainClick?: () => void;
  mainIcon?: React.ReactNode;
  className?: string;
}

export function MobileFab({
  actions,
  onMainClick,
  mainIcon = <Plus className="h-6 w-6" />,
  className,
}: MobileFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  // 避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMainClick = useCallback(() => {
    if (actions && actions.length > 0) {
      setIsOpen(!isOpen);
    } else if (onMainClick) {
      onMainClick();
    }
  }, [actions, onMainClick, isOpen]);

  const handleActionClick = useCallback((action: FabAction) => {
    action.onClick();
    setIsOpen(false);
  }, []);

  // 避免 hydration 不匹配：服务端渲染时返回 null
  if (!mounted || !isMobile) {
    return null;
  }

  return (
    <div className={cn('fixed bottom-20 right-4 z-40 lg:hidden', className)}>
      {/* 展开的菜单 */}
      {actions && actions.length > 0 && (
        <div
          className={cn(
            'absolute bottom-full right-0 mb-3 space-y-2 transition-transform transition-opacity duration-300',
            isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
          )}
        >
          {actions.map((action, index) => (
            <button
              type="button"
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex items-center gap-3 rounded-full py-2 pl-3 pr-4 shadow-lg transition-transform transition-shadow duration-200',
                'active:scale-95',
                action.variant === 'danger' && 'bg-[var(--kw-error)] text-white',
                action.variant === 'secondary' &&
                  'bg-white text-[var(--kw-text)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text)]',
                (!action.variant || action.variant === 'primary') && 'bg-[var(--kw-primary-500)] text-white'
              )}
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
              }}
            >
              <span className="flex h-8 w-8 items-center justify-center">{action.icon}</span>
              <span className="whitespace-nowrap text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 主按钮 */}
      <button
        type="button"
        onClick={handleMainClick}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform transition-shadow duration-300',
          'bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] text-white',
          'active:scale-90 active:shadow-md',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
          isOpen && 'rotate-45'
        )}
        aria-label={isOpen ? '关闭菜单' : '打开菜单'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-6 w-6" /> : mainIcon}
      </button>
    </div>
  );
}

// 简单的单个 FAB 按钮
interface SimpleFabProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

export function SimpleFab({
  onClick,
  icon = <Plus className="h-6 w-6" />,
  label,
  className,
}: SimpleFabProps) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  // 避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isMobile) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-4 z-40 lg:hidden',
        'flex h-14 w-14 items-center justify-center rounded-full shadow-lg',
        'bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] text-white',
        'transition-transform transition-shadow duration-200 active:scale-90 active:shadow-md',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
        className
      )}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

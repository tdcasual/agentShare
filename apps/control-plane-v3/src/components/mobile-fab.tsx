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
  mainIcon = <Plus className="w-6 h-6" />,
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
    <div className={cn('fixed right-4 bottom-20 z-40 lg:hidden', className)}>
      {/* 展开的菜单 */}
      {actions && actions.length > 0 && (
        <div
          className={cn(
            'absolute bottom-full right-0 mb-3 space-y-2 transition-all duration-300',
            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          )}
        >
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex items-center gap-3 pr-4 pl-3 py-2 rounded-full shadow-lg transition-all duration-200',
                'active:scale-95',
                action.variant === 'danger' && 'bg-red-500 text-white',
                action.variant === 'secondary' && 'bg-white dark:bg-[#252540] text-gray-700 dark:text-[#E8E8EC]',
                (!action.variant || action.variant === 'primary') && 'bg-pink-500 text-white'
              )}
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
              }}
            >
              <span className="w-8 h-8 flex items-center justify-center">
                {action.icon}
              </span>
              <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 主按钮 */}
      <button
        onClick={handleMainClick}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300',
          'bg-gradient-to-r from-pink-400 to-pink-500 text-white',
          'active:scale-90 active:shadow-md',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2',
          isOpen && 'rotate-45'
        )}
        aria-label={isOpen ? '关闭菜单' : '打开菜单'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="w-6 h-6" /> : mainIcon}
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
  icon = <Plus className="w-6 h-6" />,
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
      onClick={onClick}
      className={cn(
        'fixed right-4 bottom-20 z-40 lg:hidden',
        'w-14 h-14 rounded-full flex items-center justify-center shadow-lg',
        'bg-gradient-to-r from-pink-400 to-pink-500 text-white',
        'transition-all duration-200 active:scale-90 active:shadow-md',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2',
        className
      )}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

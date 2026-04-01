/**
 * Dropdown Menu - 统一下拉菜单组件
 * 
 * 封装焦点陷阱、点击外部关闭、ESC 关闭等通用逻辑
 */

'use client';

import { useFocusTrap, useClickOutside } from '@/hooks/use-focus-trap';
import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function DropdownMenu({
  isOpen,
  onClose,
  children,
  className,
  align = 'right',
  triggerRef,
}: DropdownMenuProps) {
  const { containerRef } = useFocusTrap({
    isActive: isOpen,
    onEscape: onClose,
    returnFocusOnDeactivate: true,
  });

  useClickOutside(isOpen, containerRef, onClose, triggerRef ? [triggerRef] : undefined);

  if (!isOpen) {return null;}

  return (
    <>
      {/* 遮罩 - 点击关闭 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 下拉面板 */}
      <div
        ref={containerRef}
        role="menu"
        className={cn(
          'absolute top-full mt-2 bg-white dark:bg-[#252540] rounded-2xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] overflow-hidden z-50 animate-slide-up',
          align === 'right' ? 'right-0' : 'left-0',
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function DropdownMenuItem({
  children,
  onClick,
  disabled,
  destructive,
  className,
  icon,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2',
        'text-gray-700 dark:text-[#E8E8EC] hover:bg-pink-50 dark:hover:bg-[#3D3D5C]',
        destructive && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
    </button>
  );
}

interface DropdownMenuSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function DropdownMenuSection({ title, children }: DropdownMenuSectionProps) {
  return (
    <div className="py-1">
      {title && (
        <p className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function DropdownMenuDivider() {
  return <hr className="my-1 border-pink-100 dark:border-[#3D3D5C]" />;
}

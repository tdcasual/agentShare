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

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* 遮罩 - 点击关闭 */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      {/* 下拉面板 */}
      <div
        ref={containerRef}
        role="menu"
        className={cn(
          'absolute top-full z-50 mt-2 animate-slide-up overflow-hidden rounded-2xl border border-[var(--kw-border)] bg-white shadow-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]',
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
        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
        'text-[var(--kw-text)] hover:bg-[var(--kw-primary-50)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-border)]',
        destructive &&
          'dark:hover:bg-[var(--kw-dark-error-surface)]/20 text-[var(--kw-error)] hover:bg-[var(--kw-rose-surface)] dark:text-[var(--kw-error)]',
        disabled && 'cursor-not-allowed opacity-50',
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
        <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--kw-text-muted)]">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function DropdownMenuDivider() {
  return <hr className="my-1 border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]" />;
}

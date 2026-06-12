'use client';

import { useRef, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';
import { useI18n } from '@/components/i18n-provider';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface NotificationsProps {
  className?: string;
}

export function Notifications({ className }: NotificationsProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { containerRef } = useFocusTrap({
    isActive: isOpen,
    onEscape: () => setIsOpen(false),
    onFocusOutside: () => setIsOpen(false),
  });

  const { notifications, isLoading } = useNotifications();

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={t('notifications.title')}
        className={cn(
          'relative rounded-full p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
          isOpen
            ? 'bg-[var(--kw-primary-50)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]'
            : 'text-[var(--kw-text-muted)] hover:bg-[var(--kw-primary-50)] hover:text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-text-muted)] dark:hover:bg-[var(--kw-dark-border)] dark:hover:text-[var(--kw-dark-primary)]'
        )}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          ref={containerRef}
          role="dialog"
          aria-label={t('notifications.title')}
          className="absolute right-0 top-full z-dropdown mt-2 w-80 animate-slide-up overflow-hidden rounded-2xl border border-[var(--kw-border)] bg-[var(--kw-surface)] shadow-xl sm:w-96 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--kw-border)] p-3 sm:p-4 dark:border-[var(--kw-dark-border)]">
            <h3 className="font-semibold text-[var(--kw-text)]">{t('notifications.title')}</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-[44px] min-w-[44px] rounded-lg p-1 text-[var(--kw-text-muted)] transition-colors hover:bg-[var(--kw-surface-alt)] dark:text-[var(--kw-dark-text-muted)] dark:hover:bg-[var(--kw-dark-border)]"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col items-center justify-center p-8 text-[var(--kw-text-muted)]">
                <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                <p className="text-sm">{t('notifications.loading')}</p>
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="p-8 text-left">
                <Bell className="mb-3 h-5 w-5 text-[var(--kw-text-muted)]" />
                <p className="text-sm text-[var(--kw-text-muted)]">
                  {t('notifications.emptyTitle')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

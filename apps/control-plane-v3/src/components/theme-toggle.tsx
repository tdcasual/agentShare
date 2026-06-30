'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

export function SimpleThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'flex h-10 min-h-[44px] w-10 min-w-[44px] items-center justify-center rounded-full',
          'bg-[var(--kw-surface)]/80 dark:bg-[var(--kw-dark-surface)]/80 border border-[var(--kw-primary-200)]',
          className
        )}
      >
        <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--kw-border)]" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative flex h-10 min-h-[44px] w-10 min-w-[44px] items-center justify-center rounded-full',
        'dark:bg-[var(--kw-dark-surface)]/80 bg-[var(--kw-surface)]/80',
        'border border-[var(--kw-primary-200)] dark:border-[var(--kw-dark-border)]',
        'hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-surface-alt)]',
        'transition-colors duration-300',
        className
      )}
      aria-label={isDark ? t('settings.theme.switchToLight') : t('settings.theme.switchToDark')}
      title={isDark ? t('settings.theme.switchToLight') : t('settings.theme.switchToDark')}
    >
      <span
        className={cn(
          'transition-opacity transition-transform duration-300',
          isDark ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'
        )}
        aria-hidden="true"
      >
        <Moon className="h-5 w-5 text-[var(--kw-dark-primary)]" />
      </span>
      <span
        className={cn(
          'absolute transition-opacity transition-transform duration-300',
          !isDark ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
        )}
        aria-hidden="true"
      >
        <Sun className="h-5 w-5 text-[var(--kw-primary-500)]" />
      </span>
    </button>
  );
}

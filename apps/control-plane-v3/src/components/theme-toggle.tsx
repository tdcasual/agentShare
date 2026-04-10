'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免 hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          'border border-[var(--kw-primary-200)] bg-white/80',
          className
        )}
      >
        <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--kw-border)]" />
      </div>
    );
  }

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="h-4 w-4" />, label: '浅色' },
    { value: 'dark', icon: <Moon className="h-4 w-4" />, label: '深色' },
    { value: 'system', icon: <Monitor className="h-4 w-4" />, label: '跟随系统' },
  ];

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full p-1',
        'bg-white/80 dark:bg-[var(--kw-dark-surface)]/80',
        'border border-[var(--kw-primary-200)] dark:border-[var(--kw-dark-border)]',
        className
      )}
    >
      {themes.map(({ value, icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              'relative rounded-full p-2 transition-colors transition-shadow duration-200',
              'hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-surface-alt)]',
              isActive && 'bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] text-white shadow-md'
            )}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
          >
            <span
              className={cn('transition-colors', !isActive && 'text-[var(--kw-text-muted)]')}
            >
              {icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// 简化的主题切换按钮（只在 light/dark 之间切换）
export function SimpleThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          'border border-[var(--kw-primary-200)] bg-white/80',
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
        'relative flex h-10 w-10 items-center justify-center rounded-full',
        'bg-white/80 dark:bg-[var(--kw-dark-surface)]/80',
        'border border-[var(--kw-primary-200)] dark:border-[var(--kw-dark-border)]',
        'hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-surface-alt)]',
        'transition-colors duration-300',
        className
      )}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      <span
        className={cn(
          'transition-transform transition-opacity duration-300',
          isDark ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'
        )}
      >
        <Moon className="h-5 w-5 text-[var(--kw-dark-primary)]" />
      </span>
      <span
        className={cn(
          'absolute transition-transform transition-opacity duration-300',
          !isDark ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
        )}
      >
        <Sun className="h-5 w-5 text-[var(--kw-primary-500)]" />
      </span>
    </button>
  );
}

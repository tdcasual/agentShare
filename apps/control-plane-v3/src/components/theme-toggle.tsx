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
          'flex h-[44px] min-h-[44px] w-[44px] min-w-[44px] items-center justify-center rounded-full',
          'border border-primary/20 bg-card/80',
          className
        )}
      >
        <div className="h-[20px] w-[20px] animate-pulse rounded-full bg-border" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative flex h-[44px] min-h-[44px] w-[44px] min-w-[44px] items-center justify-center rounded-full',
        'border border-primary/20 bg-card/80',
        'hover:bg-primary/10',
        'transition-colors duration-300',
        className
      )}
      aria-label={isDark ? t('settings.theme.switchToLight') : t('settings.theme.switchToDark')}
      title={isDark ? t('settings.theme.switchToLight') : t('settings.theme.switchToDark')}
    >
      <span
        className={cn(
          'transition-[opacity,transform] duration-300',
          isDark ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'
        )}
        aria-hidden="true"
      >
        <Moon className="h-[20px] w-[20px] text-primary" />
      </span>
      <span
        className={cn(
          'absolute transition-[opacity,transform] duration-300',
          !isDark ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
        )}
        aria-hidden="true"
      >
        <Sun className="h-[20px] w-[20px] text-primary" />
      </span>
    </button>
  );
}

'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

interface CuteSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function CuteSpinner({ size = 'md', className }: CuteSpinnerProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span
        className={cn('animate-float', sizeMap[size])}
        style={{ animationDelay: '0s' }}
        aria-hidden="true"
      >
        🌸
      </span>
      <span
        className={cn('animate-float', sizeMap[size])}
        style={{ animationDelay: '0.15s' }}
        aria-hidden="true"
      >
        🌸
      </span>
      <span
        className={cn('animate-float', sizeMap[size])}
        style={{ animationDelay: '0.3s' }}
        aria-hidden="true"
      >
        🌸
      </span>
    </div>
  );
}

export function CuteLoading({ text, className }: { text?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <CuteSpinner />
      <span className="text-sm font-medium text-[var(--kw-primary-500)]">
        {text ?? t('common.loading')}
      </span>
    </div>
  );
}

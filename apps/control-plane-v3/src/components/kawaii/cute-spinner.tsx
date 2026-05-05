'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

interface CuteSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function CuteSpinner({ size = 'md', className }: CuteSpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-[var(--kw-primary-500)]', sizeMap[size], className)}
      aria-hidden="true"
    />
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

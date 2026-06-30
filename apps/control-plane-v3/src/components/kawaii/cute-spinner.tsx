'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

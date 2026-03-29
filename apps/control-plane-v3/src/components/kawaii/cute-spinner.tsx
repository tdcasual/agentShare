'use client';

import { cn } from '@/lib/utils';

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
        className={cn('animate-bounce', sizeMap[size])}
        style={{ animationDelay: '0s' }}
      >
        🌸
      </span>
      <span 
        className={cn('animate-bounce', sizeMap[size])}
        style={{ animationDelay: '0.15s' }}
      >
        🌸
      </span>
      <span 
        className={cn('animate-bounce', sizeMap[size])}
        style={{ animationDelay: '0.3s' }}
      >
        🌸
      </span>
    </div>
  );
}

export function CuteLoading({ text = 'Loading...', className }: { text?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <CuteSpinner />
      <span className="text-pink-500 text-sm font-medium">{text}</span>
    </div>
  );
}

'use client';

import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const badgeVariants = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-pink-100 text-pink-700 border border-pink-200',
  secondary: 'bg-purple-100 text-purple-700 border border-purple-200',
  success: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  error: 'bg-red-100 text-red-700 border border-red-200',
  info: 'bg-blue-100 text-blue-700 border border-blue-200',
  // Identity-specific
  human: 'bg-sky-100 text-sky-700 border border-sky-200',
  agent: 'bg-green-100 text-green-700 border border-green-200',
  // Status
  online: 'bg-green-100 text-green-700 border border-green-200',
  offline: 'bg-gray-100 text-gray-500 border border-gray-200',
  away: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  busy: 'bg-red-100 text-red-700 border border-red-200',
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };

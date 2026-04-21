'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CuteSpinner } from '@/components/kawaii/cute-spinner';

// Button variants following Kawaii theme - uses CSS custom properties for theming
const buttonVariants = {
  primary:
    'bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] text-white shadow-medium shadow-[var(--kw-primary-300)]/20 hover:shadow-[var(--kw-primary-400)]/30 active:scale-95',
  secondary:
    'bg-white border-2 border-[var(--kw-primary-300)] text-[var(--kw-primary-500)] hover:bg-[var(--kw-primary-50)] hover:border-[var(--kw-primary-400)]',
  ghost: 'text-[var(--kw-primary-500)] hover:bg-[var(--kw-primary-100)]',
  gradient:
    'bg-gradient-to-r from-[var(--kw-sky)] to-[var(--kw-mint)] text-white shadow-medium shadow-[var(--kw-mint)]/20 active:scale-95',
  outline:
    'bg-transparent border-2 border-[var(--kw-primary-500)] text-[var(--kw-primary-500)] hover:bg-[var(--kw-primary-50)]',
  kawaii:
    'bg-gradient-to-r from-[var(--kw-primary-400)] via-[var(--kw-primary-500)] to-[var(--kw-primary-400)] text-white shadow-medium shadow-[var(--kw-primary-400)]/30 active:scale-95',
} as const;

const buttonSizes = {
  sm: 'px-4 py-2 text-sm min-h-[36px]',
  md: 'px-6 py-3 text-base min-h-[46px]',
  lg: 'px-8 py-4 text-lg min-h-[56px]',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  loading?: boolean;
  shimmer?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      shimmer = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-shadow transition-transform duration-[var(--kw-duration-fast)]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100',
          'relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        disabled={disabled || loading}
        aria-busy={loading ? 'true' : undefined}
        aria-disabled={disabled || loading ? 'true' : undefined}
        {...props}
      >
        {/* Shimmer overlay */}
        {shimmer && variant === 'primary' && (
          <span className="btn-shimmer pointer-events-none absolute inset-0" />
        )}

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {loading ? (
            <CuteSpinner size="sm" />
          ) : (
            <>
              {leftIcon}
              {children}
              {rightIcon}
            </>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

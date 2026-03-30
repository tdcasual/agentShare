'use client';

import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CuteSpinner } from '@/components/kawaii/cute-spinner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button variants following Kawaii theme - uses CSS custom properties for theming
const buttonVariants = {
  primary: 'bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] text-white shadow-lg shadow-pink-300/30 hover:shadow-pink-400/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95',
  secondary: 'bg-white border-2 border-[var(--kw-primary-300)] text-[var(--kw-primary-500)] hover:bg-pink-50 hover:border-[var(--kw-primary-400)] hover:-translate-y-0.5',
  ghost: 'text-[var(--kw-primary-500)] hover:bg-pink-100 hover:scale-105',
  gradient: 'bg-gradient-to-r from-[var(--kw-sky)] to-[var(--kw-mint)] text-white shadow-lg shadow-teal-300/30 hover:shadow-teal-400/40 hover:-translate-y-0.5',
  outline: 'bg-transparent border-2 border-[var(--kw-primary-500)] text-[var(--kw-primary-500)] hover:bg-pink-50 hover:-translate-y-0.5',
  kawaii: 'bg-gradient-to-r from-[var(--kw-primary-400)] via-[var(--kw-primary-500)] to-[var(--kw-primary-400)] text-white shadow-lg shadow-pink-400/40 hover:shadow-pink-500/50 hover:-translate-y-1 active:translate-y-0 bg-[length:200%_100%]',
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
  ({ 
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
  }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-full',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100',
          'relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {/* Shimmer overlay */}
        {shimmer && variant === 'primary' && (
          <span className="absolute inset-0 btn-shimmer pointer-events-none" />
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

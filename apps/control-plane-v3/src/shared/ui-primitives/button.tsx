'use client';

import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CuteSpinner } from '@/components/kawaii/cute-spinner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button variants following Kawaii theme
const buttonVariants = {
  primary: 'bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white shadow-lg shadow-pink-300/30 hover:shadow-pink-400/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95',
  secondary: 'bg-white border-2 border-[#FFB6C1] text-[#FF1493] hover:bg-pink-50 hover:border-[#FF69B4] hover:-translate-y-0.5',
  ghost: 'text-[#FF1493] hover:bg-pink-100 hover:scale-105',
  gradient: 'bg-gradient-to-r from-[#87CEEB] to-[#98FB98] text-white shadow-lg shadow-teal-300/30 hover:shadow-teal-400/40 hover:-translate-y-0.5',
  outline: 'bg-transparent border-2 border-[#FF1493] text-[#FF1493] hover:bg-pink-50 hover:-translate-y-0.5',
  kawaii: 'bg-gradient-to-r from-[#FF69B4] via-[#FF1493] to-[#FF69B4] text-white shadow-lg shadow-pink-400/40 hover:shadow-pink-500/50 hover:-translate-y-1 active:translate-y-0 bg-[length:200%_100%]',
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
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-full',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100',
          'relative overflow-hidden',
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

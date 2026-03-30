'use client';

import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const cardVariants = {
  default: 'bg-white/90 dark:bg-[#252540]/90 backdrop-blur-sm border border-pink-100/50',
  elevated: 'bg-white shadow-lg shadow-pink-100/50',
  glass: 'bg-white/70 backdrop-blur-md border border-white/60',
  gradient: 'bg-gradient-to-br from-pink-50/80 via-white/90 to-purple-50/80 border border-pink-100/30',
  feature: 'bg-gradient-to-br from-pink-50/90 to-purple-50/90 relative overflow-hidden',
  kawaii: 'bg-gradient-to-br from-white via-pink-50/30 to-purple-50/50 border border-pink-100/40',
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants;
  hover?: boolean;
  decoration?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, decoration = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl p-6 relative',
          cardVariants[variant],
          hover && 'card-kawaii cursor-pointer',
          className
        )}
        {...props}
      >
        {/* Decorative corner */}
        {decoration && (
          <span className="absolute top-3 right-3 text-xl opacity-20 select-none">
            🌸
          </span>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2 mb-4', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-xl font-bold text-gray-800 dark:text-[#E8E8EC]', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-gray-500 dark:text-[#9CA3AF]', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-pink-100/50', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

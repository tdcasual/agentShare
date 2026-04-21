'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const cardVariants = {
  default:
    'bg-white dark:bg-[var(--kw-dark-surface)] border border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]',
  elevated: 'bg-white shadow-medium dark:shadow-black/20',
  glass:
    'bg-white/80 dark:bg-[var(--kw-dark-surface)]/80 backdrop-blur-sm border border-[var(--kw-border)]/60 dark:border-[var(--kw-dark-border)]/60',
  gradient:
    'bg-gradient-to-br from-[var(--kw-surface-alt)]/80 to-[var(--kw-lavender)]/30 border border-[var(--kw-border)]/40 dark:from-[var(--kw-dark-surface)]/80 dark:to-[var(--kw-dark-surface-alt)]/30 dark:border-[var(--kw-dark-border)]/40',
  feature:
    'bg-gradient-to-br from-[var(--kw-surface-alt)]/90 to-[var(--kw-lavender)]/40 relative overflow-hidden dark:from-[var(--kw-dark-surface)]/90 dark:to-[var(--kw-dark-surface-alt)]/40',
  kawaii:
    'bg-white border border-[var(--kw-border)] dark:bg-[var(--kw-dark-surface)] dark:border-[var(--kw-dark-border)]',
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants;
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, children, onClick, ...props }, ref) => {
    // Only add role when the card is actually interactive
    const interactiveProps = onClick
      ? {
          role: 'button' as const,
          tabIndex: 0 as const,
          onClick,
          onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
            }
          },
        }
      : { onClick };

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-2xl p-6',
          cardVariants[variant],
          hover && 'card-kawaii cursor-pointer',
          className
        )}
        {...interactiveProps}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4 flex flex-col gap-2', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-xl font-bold text-[var(--kw-text)]', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-[var(--kw-text-muted)]', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'border-[var(--kw-border)]/50 mt-4 flex items-center gap-3 border-t pt-4',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

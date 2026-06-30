'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const cardVariants = {
  default:
    'bg-[var(--kw-surface)] dark:bg-[var(--kw-dark-surface)] border border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]',
  elevated: 'bg-[var(--kw-surface)] shadow-medium dark:shadow-black/20',
  gradient:
    'bg-[var(--kw-surface-alt)]/40 dark:bg-[var(--kw-dark-surface-alt)]/40 border border-[var(--kw-border)]/60 dark:border-[var(--kw-dark-border)]/60',
  feature:
    'bg-[var(--kw-surface-alt)]/50 dark:bg-[var(--kw-dark-surface-alt)]/50 border border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]',
  kawaii:
    'bg-[var(--kw-surface)] border border-[var(--kw-border)] dark:bg-[var(--kw-dark-surface)] dark:border-[var(--kw-dark-border)]',
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
              // Trigger click via DOM to get a proper MouseEvent
              event.currentTarget.click();
            }
          },
        }
      : { onClick };

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-xl p-3 sm:p-4 md:p-5',
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

export { Card };

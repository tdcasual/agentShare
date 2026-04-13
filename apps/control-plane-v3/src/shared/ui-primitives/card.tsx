'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const cardVariants = {
  default:
    'bg-white/90 dark:bg-[var(--kw-dark-surface)]/90 backdrop-blur-sm border border-[var(--kw-border)]/50',
  elevated: 'bg-white shadow-medium shadow-[var(--kw-primary-100)]/50 dark:shadow-black/20',
  glass:
    'bg-white/70 dark:bg-[var(--kw-dark-surface)]/70 backdrop-blur-md border border-white/60 dark:border-[var(--kw-dark-border)]/60',
  gradient:
    'bg-gradient-to-br from-[var(--kw-primary-50)]/80 via-[var(--kw-surface)]/90 to-[var(--kw-purple-surface)]/80 border border-[var(--kw-border)]/30 dark:from-[var(--kw-dark-surface)]/80 dark:via-[var(--kw-dark-bg)]/90 dark:to-[var(--kw-dark-surface-alt)]/80 dark:border-[var(--kw-dark-border)]/30',
  feature:
    'bg-gradient-to-br from-[var(--kw-primary-50)]/90 to-[var(--kw-purple-surface)]/90 relative overflow-hidden dark:from-[var(--kw-dark-surface)]/90 dark:to-[var(--kw-dark-surface-alt)]/90',
  kawaii:
    'bg-gradient-to-br from-[var(--kw-surface)] via-[var(--kw-primary-50)]/30 to-[var(--kw-purple-surface)]/50 border border-[var(--kw-border)]/40 dark:from-[var(--kw-dark-surface)] dark:via-[var(--kw-dark-surface)]/30 dark:to-[var(--kw-dark-surface-alt)]/50 dark:border-[var(--kw-dark-border)]/40',
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants;
  hover?: boolean;
  decoration?: boolean;
  role?: string;
  'aria-label'?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      hover = false,
      decoration = false,
      role,
      'aria-label': ariaLabel,
      children,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    // 自动推断角色：如果 hover 且有点击处理器，才视为可交互按钮
    const inferredRole = role ?? (hover && onClick ? 'button' : 'region');

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (hover && onClick && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        const syntheticClick = new Proxy(event, {
          get(target, prop) {
            if (prop === 'button') {
              return 0;
            }
            if (prop === 'buttons') {
              return 0;
            }
            if (prop === 'clientX') {
              return 0;
            }
            if (prop === 'clientY') {
              return 0;
            }
            if (prop === 'movementX') {
              return 0;
            }
            if (prop === 'movementY') {
              return 0;
            }
            if (prop === 'offsetX') {
              return 0;
            }
            if (prop === 'offsetY') {
              return 0;
            }
            if (prop === 'pageX') {
              return 0;
            }
            if (prop === 'pageY') {
              return 0;
            }
            if (prop === 'relatedTarget') {
              return null;
            }
            if (prop === 'screenX') {
              return 0;
            }
            if (prop === 'screenY') {
              return 0;
            }
            if (prop === 'type') {
              return 'click';
            }
            return (target as unknown as Record<string | symbol, unknown>)[prop as string];
          },
        }) as unknown as React.MouseEvent<HTMLDivElement>;
        onClick(syntheticClick);
      }
    };

    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        ref={ref}
        role={inferredRole}
        aria-label={ariaLabel}
        tabIndex={hover ? 0 : undefined}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative rounded-3xl p-6',
          cardVariants[variant],
          hover && 'card-kawaii cursor-pointer',
          className
        )}
        {...props}
      >
        {/* Decorative corner */}
        {decoration && (
          <span
            className="absolute right-3 top-3 select-none text-xl opacity-20"
            aria-hidden="true"
          >
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

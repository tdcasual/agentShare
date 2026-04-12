'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

const avatarSizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-xl',
} as const;

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  fallback?: string;
  size?: keyof typeof avatarSizes;
  type?: 'human' | 'agent';
  status?: 'online' | 'away' | 'busy' | 'offline';
  className?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, srcSet, sizes, alt, fallback, size = 'md', type, status, className, ...props }, ref) => {
    const { t } = useI18n();
    const [error, setError] = React.useState(false);

    const getFallback = () => {
      if (fallback) {
        return fallback;
      }
      if (type === 'human') {
        return '👤';
      }
      if (type === 'agent') {
        return '🤖';
      }
      return '👤';
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden rounded-full',
          avatarSizes[size],
          type === 'human' && 'ring-2 ring-[var(--kw-human-accent)]',
          type === 'agent' && 'ring-2 ring-[var(--kw-agent-accent)]',
          className
        )}
        {...props}
      >
        {src && !error ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={
              alt ||
              (type === 'human'
                ? t('common.userAvatar')
                : type === 'agent'
                  ? t('common.agentAvatar')
                  : t('common.userAvatar'))
            }
            className="h-full w-full object-cover"
            onError={() => setError(true)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--kw-primary-100)] to-[var(--kw-purple-surface)]"
            role="img"
            aria-label={
              alt ||
              (type === 'human'
                ? t('common.userAvatar')
                : type === 'agent'
                  ? t('common.agentAvatar')
                  : t('common.userAvatar'))
            }
          >
            {getFallback()}
          </span>
        )}

        {status && (
          <span
            aria-label={status}
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--kw-surface)] dark:border-[var(--kw-dark-surface)]',
              status === 'online' && 'bg-[var(--kw-agent-accent)]',
              status === 'away' && 'bg-[var(--kw-warning)]',
              status === 'busy' && 'bg-[var(--kw-error)]',
              status === 'offline' && 'bg-[var(--kw-text-muted)]'
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  max?: number;
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, max = 4, className, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const showChildren = childrenArray.slice(0, max);
    const remaining = childrenArray.length - max;

    return (
      <div ref={ref} className={cn('flex -space-x-2', className)} {...props}>
        {showChildren}
        {remaining > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kw-surface-alt)] text-xs text-[var(--kw-text-muted)] ring-2 ring-[var(--kw-surface)] dark:bg-[var(--kw-dark-surface-alt)] dark:ring-[var(--kw-dark-surface)]">
            +{remaining}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup };

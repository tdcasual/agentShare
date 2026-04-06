'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const avatarSizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-xl',
} as const;

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: keyof typeof avatarSizes;
  type?: 'human' | 'agent';
  status?: 'online' | 'away' | 'busy' | 'offline';
  className?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, fallback, size = 'md', type, status, className, ...props }, ref) => {
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
          type === 'human' && 'ring-2 ring-sky-300',
          type === 'agent' && 'ring-2 ring-green-300',
          className
        )}
        {...props}
      >
        {src && !error ? (
          <img
            src={src}
            alt={
              alt ||
              (type === 'human' ? 'User avatar' : type === 'agent' ? 'Agent avatar' : 'Avatar')
            }
            className="h-full w-full object-cover"
            onError={() => setError(true)}
            loading="lazy"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100"
            role="img"
            aria-label={
              alt ||
              (type === 'human' ? 'User avatar' : type === 'agent' ? 'Agent avatar' : 'Avatar')
            }
          >
            {getFallback()}
          </span>
        )}

        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white',
              status === 'online' && 'bg-green-400',
              status === 'away' && 'bg-yellow-400',
              status === 'busy' && 'bg-red-400',
              status === 'offline' && 'bg-gray-300'
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-600 ring-2 ring-white dark:text-[#9CA3AF]">
            +{remaining}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup };

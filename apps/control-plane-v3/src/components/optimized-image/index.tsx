'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  containerClassName,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(!priority);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // 错误状态显示占位符
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-[#2D2D50]',
          'text-gray-400 dark:text-[#9CA3AF]',
          fill ? 'w-full h-full' : '',
          containerClassName
        )}
        style={!fill ? { width, height } : undefined}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'bg-gray-100 dark:bg-[#2D2D50]',
        fill ? 'w-full h-full' : '',
        containerClassName
      )}
    >
      {/* 加载占位符 */}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0',
            'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100',
            'dark:from-[#2D2D50] dark:via-[#3D3D5C] dark:to-[#2D2D50]',
            'animate-pulse',
            'z-10'
          )}
        />
      )}

      {/* 实际图片 */}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        sizes={sizes}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});

// Avatar 专用优化图片组件
interface OptimizedAvatarProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  priority?: boolean;
}

export const OptimizedAvatar = memo(function OptimizedAvatar({
  src,
  alt,
  size = 48,
  className,
  priority = false,
}: OptimizedAvatarProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          'bg-gradient-to-br from-pink-100 to-pink-200',
          'dark:from-[#3D3D5C] dark:to-[#4D4D6C]',
          'rounded-full',
          className
        )}
        style={{ width: size, height: size }}
      >
        <span className="text-lg">👤</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full',
        'ring-2 ring-white dark:ring-[#3D3D5C]',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className="object-cover w-full h-full"
        onError={() => setHasError(true)}
      />
    </div>
  );
});

export default OptimizedImage;

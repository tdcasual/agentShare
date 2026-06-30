'use client';

import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
  minHeight?: string;
}

export function PageLoader({ message, fullScreen = false, minHeight = '60vh' }: PageLoaderProps) {
  return (
    <div
      className={cn('flex items-center justify-center', fullScreen && 'min-h-screen bg-background')}
      style={fullScreen ? undefined : { minHeight }}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size={fullScreen ? 'lg' : 'md'} className="text-muted-foreground" />
        {message && <p className="text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

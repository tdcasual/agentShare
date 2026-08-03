'use client';

import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function PageLoader({ message, fullScreen = false }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex items-center justify-center',
        fullScreen ? 'min-h-screen bg-background' : 'min-h-[60vh]'
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size={fullScreen ? 'lg' : 'md'} className="text-muted-foreground" />
        {message && <p className="text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

import * as React from 'react';
import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Inline error alert with a consistent destructive style.
 * Replaces ad-hoc error banners across forms and pages.
 */
export function InlineAlert({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md border border-status-danger/20 bg-status-danger-subtle px-4 py-3 text-sm text-status-danger-subtle-foreground',
        className
      )}
      {...props}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

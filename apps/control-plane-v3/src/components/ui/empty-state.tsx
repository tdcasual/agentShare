import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn('p-6 text-center', className)} {...props}>
      {icon && (
        <div className="mb-2 text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="mb-1 text-sm font-semibold text-foreground">{title}</h2>
      {description && <p className="mb-3 text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

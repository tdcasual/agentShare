import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const calloutVariants = cva('flex items-start gap-3 rounded-lg p-4 text-sm', {
  variants: {
    variant: {
      brand:
        'border border-l-4 border-l-status-brand bg-status-brand-subtle text-status-brand-subtle-foreground',
      info: 'border border-status-info/20 bg-status-info-subtle text-status-info-subtle-foreground',
      warning:
        'border border-status-warning/20 bg-status-warning-subtle text-status-warning-subtle-foreground',
    },
  },
  defaultVariants: {
    variant: 'brand',
  },
});

export interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof calloutVariants> {
  icon?: React.ReactNode;
}

export function Callout({ className, variant, icon, children, ...props }: CalloutProps) {
  return (
    <div className={cn(calloutVariants({ variant }), className)} {...props}>
      {icon && <div className="mt-0.5 flex-shrink-0">{icon}</div>}
      <div className="flex-1">{children}</div>
    </div>
  );
}

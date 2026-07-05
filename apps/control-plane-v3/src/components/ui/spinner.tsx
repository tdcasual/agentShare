import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

export interface SpinnerProps {
  size?: keyof typeof sizeMap;
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <Loader2 aria-hidden="true" className={cn('animate-spin', sizeMap[size], className)} />;
}

'use client'

import { cn } from '@/lib/utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  isHoverable?: boolean
  isPressable?: boolean
}

export function Card({
  children,
  className,
  isHoverable = false,
  isPressable = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden',
        'transition-all duration-200',
        isHoverable && 'hover:shadow-md hover:border-neutral-300/60 dark:hover:border-neutral-700/60 hover:-translate-y-0.5',
        isPressable && 'active:scale-[0.995]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4 border-b border-neutral-100 dark:border-neutral-800', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50', className)} {...props}>
      {children}
    </div>
  )
}

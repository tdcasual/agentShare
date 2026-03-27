'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'error'

interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  pulse?: boolean
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  accent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        pulse && 'ring-pulse',
        className
      )}
    >
      {children}
    </span>
  )
}

'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useReducedMotion } from '@/components/motion-config'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  children: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const { prefersReducedMotion } = useReducedMotion()
  const isDisabled = disabled || isLoading

  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100',
    secondary: 'bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 dark:bg-neutral-800 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-700 dark:hover:border-neutral-600',
    ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
  }
  
  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-md',
    md: 'h-10 px-4 text-sm rounded-lg',
    lg: 'h-12 px-6 text-base rounded-lg',
  }

  return (
    <motion.button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      whileTap={isDisabled || prefersReducedMotion ? {} : { scale: 0.97 }}
      transition={{ duration: 0.1 }}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      )}
      {!isLoading && LeftIcon && (
        <LeftIcon className="w-4 h-4" aria-hidden="true" />
      )}
      {children}
      {!isLoading && RightIcon && (
        <RightIcon className="w-4 h-4" aria-hidden="true" />
      )}
    </motion.button>
  )
}

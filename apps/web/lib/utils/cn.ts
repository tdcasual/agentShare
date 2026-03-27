// Utility for merging tailwind classes
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with proper precedence
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Conditionally join class names
 * Simpler alternative when tailwind-merge is not needed
 */
export function cx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

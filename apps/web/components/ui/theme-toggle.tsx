'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getStoredTheme, setStoredTheme, type Theme } from '@/lib/theme'
import { useReducedMotion } from '@/components/motion-config'

const themes: { key: Theme; icon: typeof Sun; label: string }[] = [
  { key: 'light', icon: Sun, label: 'Light' },
  { key: 'dark', icon: Moon, label: 'Dark' },
  { key: 'system', icon: Monitor, label: 'System' },
]

export function ThemeToggle({ className }: { className?: string }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>('system')
  const [isOpen, setIsOpen] = useState(false)
  const { prefersReducedMotion } = useReducedMotion()

  useEffect(() => {
    setCurrentTheme(getStoredTheme())
  }, [])

  const handleThemeChange = (theme: Theme) => {
    setStoredTheme(theme)
    setCurrentTheme(theme)
    setIsOpen(false)
  }

  const CurrentIcon = themes.find(t => t.key === currentTheme)?.icon || Sun

  return (
    <div className={cn('relative', className)}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        type="button"
      >
        <CurrentIcon className="w-4 h-4" aria-hidden="true" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 p-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg z-50 min-w-[140px]"
              role="listbox"
              aria-label="Select theme"
            >
              {themes.map(({ key, icon: Icon, label }) => (
                <motion.button
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors',
                    currentTheme === key
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  )}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  role="option"
                  aria-selected={currentTheme === key}
                  type="button"
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                  {currentTheme === key && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-white" aria-hidden="true" />
                  )}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useReducedMotion } from '@/components/motion-config'
import { 
  Home, 
  Layers, 
  Shield, 
  Code2,
  Bell,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { tr } from '@/lib/i18n-shared'
import type { Locale } from '@/lib/i18n-shared'

const navItems = [
  { href: '/', icon: Home, label: 'Overview', labelZh: '概览', badge: null },
  { href: '/tasks', icon: Layers, label: 'Tasks', labelZh: '任务', badge: 'tasks' },
  { href: '/approvals', icon: Shield, label: 'Approvals', labelZh: '审批', badge: 'approvals' },
  { href: '/playground', icon: Code2, label: 'Playground', labelZh: '演练场', badge: null },
]

interface FloatingNavProps {
  locale: Locale
  badgeCounts: { tasks: number; approvals: number }
  isAuthenticated?: boolean
}

export function FloatingNav({ locale, badgeCounts, isAuthenticated = false }: FloatingNavProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { prefersReducedMotion } = useReducedMotion()

  const navMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { y: -100, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
      }

  return (
    <>
      {/* Desktop Navigation - Simplified, no glassmorphism */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 hidden md:block"
        {...navMotionProps}
      >
        <div className="bg-white/95 dark:bg-neutral-950/95 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center">
                  <span className="text-white dark:text-neutral-900 font-bold text-sm">A</span>
                </div>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  Agent Control Plane
                </span>
              </Link>

              {/* Nav Items */}
              <div className="flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  const badge = item.badge ? badgeCounts[item.badge as keyof typeof badgeCounts] : null
                  const Icon = item.icon

                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        className={cn(
                          'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                          isActive 
                            ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white' 
                            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/50'
                        )}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        <span>{tr(locale, item.label, item.labelZh)}</span>
                        
                        {/* Badge */}
                        {badge ? (
                          <span className="flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold bg-rose-500 text-white rounded-full">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ) : null}
                      </motion.div>
                    </Link>
                  )
                })}
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  className="relative flex items-center justify-center w-8 h-8 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
                  aria-label={tr(locale, 'Notifications', '通知')}
                >
                  <Bell className="w-4 h-4" aria-hidden="true" />
                  {badgeCounts.approvals > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-neutral-900 dark:bg-white flex items-center justify-center">
              <span className="text-white dark:text-neutral-900 font-bold text-xs">A</span>
            </div>
            <span className="font-medium text-sm text-neutral-900 dark:text-white truncate">
              Agent Control Plane
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label={isMobileMenuOpen ? tr(locale, 'Close menu', '关闭菜单') : tr(locale, 'Open menu', '打开菜单')}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 overflow-hidden"
            >
              <nav className="p-2 space-y-0.5" role="navigation" aria-label={tr(locale, 'Mobile navigation', '移动端导航')}>
                {navItems.map((item, index) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  const badge = item.badge ? badgeCounts[item.badge as keyof typeof badgeCounts] : null
                  const Icon = item.icon

                  return (
                    <motion.div
                      key={item.href}
                      initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: prefersReducedMotion ? 0 : index * 0.03 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                            : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800/50'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" aria-hidden="true" />
                          {tr(locale, item.label, item.labelZh)}
                        </div>
                        {badge ? (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-rose-500 text-white rounded-full">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ) : null}
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

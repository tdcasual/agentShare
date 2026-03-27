'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useReducedMotion } from '@/components/motion-config'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const { prefersReducedMotion } = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.35, 
        ease: [0, 0, 0.2, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger children animation wrapper
export function StaggerContainer({ 
  children, 
  className,
  delay = 0.1 
}: { 
  children: ReactNode
  className?: string
  delay?: number
}) {
  const { prefersReducedMotion } = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.05,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Individual stagger item
export function StaggerItem({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string
}) {
  const { prefersReducedMotion } = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 300,
            damping: 25,
          }
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Fade in when scrolling into view
export function FadeInWhenVisible({ 
  children, 
  className,
  delay = 0
}: { 
  children: ReactNode
  className?: string
  delay?: number
}) {
  const { prefersReducedMotion } = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ 
        duration: 0.5, 
        ease: [0, 0, 0.2, 1],
        delay 
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

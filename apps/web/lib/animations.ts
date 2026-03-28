// Animation System - Purposeful Motion
// Built with Framer Motion

import type { Transition, Variants } from 'framer-motion'

// Easing functions as arrays
const easeDefault = [0.4, 0, 0.2, 1] as const
const easeDecelerate = [0, 0, 0.2, 1] as const
const easeAccelerate = [0.4, 0, 1, 1] as const
const easeSpring = [0.34, 1.56, 0.64, 1] as const

// Base transitions
export const transitions: Record<string, Transition> = {
  fast: {
    duration: 0.15,
    ease: easeDefault,
  },
  
  default: {
    duration: 0.25,
    ease: easeDefault,
  },
  
  emphasis: {
    duration: 0.35,
    ease: easeSpring,
  },
  
  enter: {
    duration: 0.35,
    ease: easeDecelerate,
  },
  
  exit: {
    duration: 0.15,
    ease: easeAccelerate,
  },
  
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  },
  
  springSoft: {
    type: 'spring',
    stiffness: 300,
    damping: 25,
  },
  
  springBouncy: {
    type: 'spring',
    stiffness: 500,
    damping: 15,
  },
}

// Common animation variants
export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.enter,
  },
} as Variants

export const fadeInDown = {
  hidden: { opacity: 0, y: -12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.enter,
  },
} as Variants

export const fadeInLeft = {
  hidden: { opacity: 0, x: -12 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.enter,
  },
} as Variants

export const fadeInRight = {
  hidden: { opacity: 0, x: 12 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.enter,
  },
} as Variants

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.springSoft,
  },
} as Variants

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transitions.default,
  },
} as Variants

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
} as Variants

export const staggerFast = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
} as Variants

export const listItem = {
  hidden: { opacity: 0, x: -8 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    x: 8,
    transition: transitions.fast,
  },
} as Variants

export const cardHover = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: 'var(--shadow-sm)',
  },
  hover: {
    scale: 1.01,
    y: -2,
    boxShadow: 'var(--shadow-lg)',
    transition: transitions.springSoft,
  },
  tap: {
    scale: 0.99,
    transition: transitions.fast,
  },
} as Variants

export const buttonTap = {
  scale: 0.97,
  transition: transitions.fast,
}

export const modal = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.springSoft,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: transitions.exit,
  },
} as Variants

export const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} as Variants

export const slideInRight = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: transitions.springSoft,
  },
  exit: {
    x: '100%',
    transition: transitions.exit,
  },
} as Variants

export const slideInLeft = {
  hidden: { x: '-100%' },
  visible: {
    x: 0,
    transition: transitions.springSoft,
  },
  exit: {
    x: '-100%',
    transition: transitions.exit,
  },
} as Variants

export const popIn = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: transitions.emphasis,
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: transitions.fast,
  },
} as Variants

export const countUp = {
  hidden: { opacity: 0, y: 20, scale: 1.2 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: easeSpring,
    },
  },
} as Variants

export const pageTransition = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...transitions.enter,
      when: 'beforeChildren',
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: transitions.exit,
  },
} as Variants

export const shimmer = {
  hidden: { x: '-100%' },
  visible: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
} as Variants

// Legacy variants object for backward compatibility
export const variants: Record<string, Variants> = {
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  fadeInScale,
  fadeIn,
  stagger: staggerContainer,
  staggerFast,
  listItem,
  cardHover,
  modal,
  backdrop,
  slideInRight,
  slideInLeft,
  popIn,
  countUp,
  page: pageTransition,
  shimmer,
}

// Layout animation props
export const layoutProps = {
  layout: true,
  transition: transitions.springSoft,
}

// Animate presence props
export const presenceProps = {
  mode: 'wait' as const,
  initial: 'hidden',
  animate: 'visible',
  exit: 'exit',
}

// Viewport animation settings
export const viewportSettings = {
  once: true,
  margin: '-50px',
  amount: 0.3,
}

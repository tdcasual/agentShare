'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'

interface ReducedMotionContextType {
  prefersReducedMotion: boolean
}

const ReducedMotionContext = createContext<ReducedMotionContextType>({
  prefersReducedMotion: false,
})

export function useReducedMotion() {
  return useContext(ReducedMotionContext)
}

interface MotionProviderProps {
  children: ReactNode
}

export function MotionProvider({ children }: MotionProviderProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <ReducedMotionContext.Provider value={{ prefersReducedMotion }}>
      <MotionConfig
        reducedMotion={prefersReducedMotion ? 'always' : 'never'}
        transition={{
          duration: prefersReducedMotion ? 0 : undefined,
        }}
      >
        {children}
      </MotionConfig>
    </ReducedMotionContext.Provider>
  )
}

// Hook for components that need custom reduced motion handling
export function useMotionPreference() {
  const { prefersReducedMotion } = useReducedMotion()
  
  return {
    isReducedMotion: prefersReducedMotion,
    // Helper to conditionally apply animation props
    animate: <T extends Record<string, unknown>>(animated: T, static_?: Partial<T>): T | Partial<T> => {
      return prefersReducedMotion ? (static_ || {} as Partial<T>) : animated
    },
    // Transition helper
    transition: (normal: object, reduced?: object) => {
      return prefersReducedMotion ? (reduced || { duration: 0 }) : normal
    },
  }
}

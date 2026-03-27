// Design Tokens - Modern, Clean, Minimalist
// Inspired by Linear, Vercel, Notion

export const colors = {
  // Primary - Cool neutral with slight blue tint
  accent: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  
  // Neutral - Warm gray for better readability
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  
  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Dark mode specific
  dark: {
    bg: '#09090b',
    surface: '#18181b',
    elevated: '#27272a',
    border: '#3f3f46',
    hover: '#3f3f46',
  }
} as const

// Spacing system - 4px base grid
export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
} as const

// Border radius system
export const radius = {
  none: '0px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const

// Typography scale
export const typography = {
  fontFamily: {
    sans: 'var(--font-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: ['12px', { lineHeight: '16px' }],
    sm: ['13px', { lineHeight: '20px' }],
    base: ['14px', { lineHeight: '22px' }],
    lg: ['16px', { lineHeight: '24px' }],
    xl: ['18px', { lineHeight: '28px' }],
    '2xl': ['20px', { lineHeight: '28px' }],
    '3xl': ['24px', { lineHeight: '32px' }],
    '4xl': ['30px', { lineHeight: '36px' }],
    '5xl': ['36px', { lineHeight: '40px' }],
  } as const,
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  } as const,
}

// Shadow system - subtle and layered
export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.04), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.04), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.12)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.04)',
  none: 'none',
} as const

// Glow effects for dark mode
export const glows = {
  accent: '0 0 20px -5px rgba(99, 102, 241, 0.4)',
  success: '0 0 20px -5px rgba(34, 197, 94, 0.4)',
  error: '0 0 20px -5px rgba(239, 68, 68, 0.4)',
  warning: '0 0 20px -5px rgba(245, 158, 11, 0.4)',
} as const

// Easing functions
export const easing = {
  // Standard
  default: [0.4, 0, 0.2, 1],
  // Decelerate - for entering elements
  decelerate: [0, 0, 0.2, 1],
  // Accelerate - for exiting elements
  accelerate: [0.4, 0, 1, 1],
  // Spring - for playful interactions
  spring: [0.34, 1.56, 0.64, 1],
  // Smooth - for general transitions
  smooth: [0.19, 1, 0.22, 1],
  // Bounce - for emphasis
  bounce: [0.68, -0.55, 0.265, 1.55],
} as const

// Animation durations
export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
  slower: 0.5,
} as const

// Z-index scale
export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 100,
  sticky: 200,
  banner: 300,
  overlay: 400,
  modal: 500,
  popover: 600,
  skipLink: 700,
  toast: 800,
  tooltip: 900,
} as const

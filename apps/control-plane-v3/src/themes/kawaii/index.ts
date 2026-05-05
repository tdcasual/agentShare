// ============================================
// Kawaii Theme - Dual Cosmos
// ============================================

import type { ThemeDefinition } from '../../core/plugin/types';

export const kawaiiTheme: ThemeDefinition = {
  id: 'kawaii-dual-cosmos',
  name: 'Kawaii Dual Cosmos',
  version: '1.0.0',

  variables: {
    // Primary colors - Pink gradient (kept for compatibility)
    '--kw-primary-50': '#FFF0F5',
    '--kw-primary-100': '#FFE4E1',
    '--kw-primary-200': '#FFC0CB',
    '--kw-primary-300': '#FFB6C1',
    '--kw-primary-400': '#f472b6',
    '--kw-primary-500': '#db2777',
    '--kw-primary-600': '#a03060',

    // Secondary colors - Candy palette
    '--kw-mint': '#7dd87d',
    '--kw-sky': '#6ba8c7',
    '--kw-lavender': '#d4d4e8',
    '--kw-peach': '#e8c9a8',
    '--kw-lemon': '#f0e8b8',

    // Semantic colors
    '--kw-success': '#22c55e',
    '--kw-warning': '#f59e0b',
    '--kw-error': '#ef4444',
    '--kw-info': '#3b82f6',

    // Neutrals - calmer, more operational
    '--kw-bg': '#f6f5f8',
    '--kw-surface': '#FFFFFF',
    '--kw-surface-alt': '#F4F4F7',
    '--kw-border': '#E4E4EF',
    '--kw-text': '#2d2d3a',
    '--kw-text-muted': '#6b6b7b',

    // Human/Agent accent colors
    '--kw-human-accent': '#0ea5e9',
    '--kw-agent-accent': '#22c55e',
    '--kw-dual-gradient': 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',

    // Spacing
    '--kw-radius-sm': '8px',
    '--kw-radius-md': '16px',
    '--kw-radius-lg': '24px',
    '--kw-radius-xl': '32px',
    '--kw-radius-full': '9999px',

    // Shadows - neutral, no pink tint
    '--kw-shadow-soft': '0 1px 3px rgba(0, 0, 0, 0.04)',
    '--kw-shadow-medium': '0 2px 8px rgba(0, 0, 0, 0.05)',
    '--kw-shadow-glow': '0 0 12px rgba(0, 0, 0, 0.06)',

    // Animation timing
    '--kw-duration-fast': '150ms',
    '--kw-duration-normal': '250ms',
    '--kw-duration-slow': '400ms',
    '--kw-easing-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    '--kw-easing-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  components: {
    Button: {
      base: 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-[var(--kw-duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed',
      variants: {
        primary:
          'bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] text-white shadow-medium hover:shadow-medium active:scale-95 rounded-full',
        secondary:
          'bg-white border-2 border-[var(--kw-primary-300)] text-[var(--kw-primary-500)] hover:bg-[var(--kw-primary-50)] hover:border-[var(--kw-primary-400)] rounded-full',
        ghost: 'text-[var(--kw-primary-500)] hover:bg-[var(--kw-primary-100)] rounded-full',
        gradient:
          'bg-gradient-to-r from-[var(--kw-sky)] to-[var(--kw-mint)] text-white shadow-medium active:scale-95 rounded-full',
      },
      sizes: {
        sm: 'px-4 py-2 text-sm min-h-[44px]',
        md: 'px-6 py-3 text-base min-h-[46px]',
        lg: 'px-8 py-4 text-lg min-h-[56px]',
      },
    },

    Card: {
      base: 'rounded-3xl bg-[var(--kw-surface)] border border-[var(--kw-border)] shadow-soft',
      variants: {
        default: '',
        elevated: 'shadow-medium hover:shadow-medium',
        glass: 'bg-[var(--kw-surface)]/95 border border-[var(--kw-border)]',
        gradient: 'bg-gradient-to-br from-[var(--kw-primary-50)] to-[var(--kw-lavender)]',
      },
    },

    Input: {
      base: 'w-full rounded-2xl border-2 border-[var(--kw-border)] bg-white px-4 py-3 text-base outline-none transition-colors transition-shadow duration-[var(--kw-duration-fast)] placeholder:text-[var(--kw-text-muted)]',
      states: {
        focus:
          'focus:border-[var(--kw-primary-400)] focus:ring-2 focus:ring-[var(--kw-primary-100)]',
        error:
          'border-[var(--kw-rose-surface)] focus:border-[var(--kw-error)] focus:ring-[var(--kw-rose-surface)]',
      },
    },

    Badge: {
      base: 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
      variants: {
        default: 'bg-[var(--kw-surface-alt)] text-[var(--kw-text)]',
        success:
          'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] border border-[var(--kw-green-surface)]',
        warning:
          'bg-[var(--kw-amber-surface)] text-[var(--kw-amber-text)] border border-[var(--kw-amber-surface)]',
        error:
          'bg-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] border border-[var(--kw-rose-surface)]',
        info: 'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)] border border-[var(--kw-sky-surface)]',
        pink: 'bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] border border-[var(--kw-primary-200)]',
        human:
          'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)] border border-[var(--kw-sky-surface)]',
        agent:
          'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] border border-[var(--kw-green-surface)]',
      },
    },

    Avatar: {
      base: 'rounded-full object-cover border-2 border-white shadow-soft',
      sizes: {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
      },
      types: {
        human: 'border-[var(--kw-human-accent)]',
        agent: 'border-[var(--kw-agent-accent)]',
      },
    },
  },

  animations: {
    'fade-in': {
      keyframes: {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      duration: '250ms',
      easing: 'ease-out',
    },

    'slide-up': {
      keyframes: {
        from: { opacity: 0, transform: 'translateY(12px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      duration: '300ms',
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },

    'bounce-in': {
      keyframes: {
        '0%': { opacity: 0, transform: 'scale(0.95)' },
        '100%': { opacity: 1, transform: 'scale(1)' },
      },
      duration: '300ms',
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },

    float: {
      keyframes: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-4px)' },
      },
      duration: '4s',
      easing: 'ease-in-out',
    },

    'pulse-glow': {
      keyframes: {
        '0%, 100%': { boxShadow: '0 0 8px rgba(0, 0, 0, 0.04)' },
        '50%': { boxShadow: '0 0 14px rgba(0, 0, 0, 0.08)' },
      },
      duration: '3s',
      easing: 'ease-in-out',
    },

    shake: {
      keyframes: {
        '0%, 100%': { transform: 'translateX(0)' },
        '25%': { transform: 'translateX(-4px)' },
        '75%': { transform: 'translateX(4px)' },
      },
      duration: '300ms',
      easing: 'ease-in-out',
    },

    'spin-slow': {
      keyframes: {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' },
      },
      duration: '3s',
      easing: 'linear',
    },
  },
};

// Helper function to apply CSS variables
export function applyKawaiiTheme(): void {
  const root = document.documentElement;

  Object.entries(kawaiiTheme.variables).forEach(([key, value]) => {
    if (key.startsWith('--')) {
      root.style.setProperty(key, value);
    }
  });
}

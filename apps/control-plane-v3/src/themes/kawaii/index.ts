// ============================================
// Kawaii Theme - Dual Cosmos
// ============================================

import type { ThemeDefinition } from '../../core/plugin/types';

export const kawaiiTheme: ThemeDefinition = {
  id: 'kawaii-dual-cosmos',
  name: 'Kawaii Dual Cosmos',
  version: '1.0.0',
  
  variables: {
    // Primary colors - Pink gradient
    '--kw-primary-50': '#FFF0F5',
    '--kw-primary-100': '#FFE4E1',
    '--kw-primary-200': '#FFC0CB',
    '--kw-primary-300': '#FFB6C1',
    '--kw-primary-400': '#FF69B4',
    '--kw-primary-500': '#FF1493',
    '--kw-primary-600': '#DB7093',
    
    // Secondary colors - Candy palette
    '--kw-mint': '#98FB98',
    '--kw-sky': '#87CEEB',
    '--kw-lavender': '#E6E6FA',
    '--kw-peach': '#FFDAB9',
    '--kw-lemon': '#FFFACD',
    
    // Semantic colors
    '--kw-success': '#90EE90',
    '--kw-warning': '#FFD700',
    '--kw-error': '#FF6B6B',
    '--kw-info': '#87CEFA',
    
    // Neutrals
    '--kw-bg': '#FFFAFA',
    '--kw-surface': '#FFFFFF',
    '--kw-surface-alt': '#F8F8FF',
    '--kw-border': '#E6E6FA',
    '--kw-text': '#4A4A4A',
    '--kw-text-muted': '#8B8B8B',
    
    // Human/Agent accent colors
    '--kw-human-accent': '#87CEEB',
    '--kw-agent-accent': '#98FB98',
    '--kw-dual-gradient': 'linear-gradient(135deg, #87CEEB 0%, #98FB98 100%)',
    
    // Spacing
    '--kw-radius-sm': '8px',
    '--kw-radius-md': '16px',
    '--kw-radius-lg': '24px',
    '--kw-radius-xl': '32px',
    '--kw-radius-full': '9999px',
    
    // Shadows
    '--kw-shadow-soft': '0 4px 20px rgba(255, 105, 180, 0.15)',
    '--kw-shadow-medium': '0 8px 30px rgba(255, 105, 180, 0.2)',
    '--kw-shadow-glow': '0 0 20px rgba(255, 105, 180, 0.4)',
    
    // Animation timing
    '--kw-duration-fast': '150ms',
    '--kw-duration-normal': '300ms',
    '--kw-duration-slow': '500ms',
    '--kw-easing-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    '--kw-easing-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  components: {
    Button: {
      base: 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
      variants: {
        primary: 'bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white shadow-lg hover:shadow-pink-300/50 hover:-translate-y-0.5 active:translate-y-0 rounded-full',
        secondary: 'bg-white border-2 border-[#FFB6C1] text-[#FF1493] hover:bg-pink-50 hover:border-[#FF69B4] rounded-full',
        ghost: 'text-[#FF1493] hover:bg-pink-100 rounded-full',
        gradient: 'bg-gradient-to-r from-[#87CEEB] to-[#98FB98] text-white shadow-lg hover:shadow-lg hover:-translate-y-0.5 rounded-full',
      },
      sizes: {
        sm: 'px-4 py-2 text-sm min-h-[36px]',
        md: 'px-6 py-3 text-base min-h-[46px]',
        lg: 'px-8 py-4 text-lg min-h-[56px]',
      },
    },
    
    Card: {
      base: 'rounded-3xl bg-white/80 backdrop-blur-sm border border-pink-100 shadow-soft',
      variants: {
        default: '',
        elevated: 'shadow-medium hover:shadow-glow',
        glass: 'bg-white/60 backdrop-blur-md',
        gradient: 'bg-gradient-to-br from-pink-50 to-lavender-50',
      },
    },
    
    Input: {
      base: 'w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none transition-all duration-200 placeholder:text-gray-400',
      states: {
        focus: 'focus:border-pink-400 focus:ring-4 focus:ring-pink-100',
        error: 'border-red-300 focus:border-red-400 focus:ring-red-100',
      },
    },
    
    Badge: {
      base: 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
      variants: {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-green-100 text-green-700 border border-green-200',
        warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
        error: 'bg-red-100 text-red-700 border border-red-200',
        info: 'bg-blue-100 text-blue-700 border border-blue-200',
        pink: 'bg-pink-100 text-pink-700 border border-pink-200',
        human: 'bg-sky-100 text-sky-700 border border-sky-200',
        agent: 'bg-green-100 text-green-700 border border-green-200',
      },
    },
    
    Avatar: {
      base: 'rounded-full object-cover border-2 border-white shadow-md',
      sizes: {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
      },
      types: {
        human: 'border-sky-300',
        agent: 'border-green-300',
      },
    },
  },
  
  animations: {
    'fade-in': {
      keyframes: {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      duration: '300ms',
      easing: 'ease-out',
    },
    
    'slide-up': {
      keyframes: {
        from: { opacity: 0, transform: 'translateY(20px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      duration: '400ms',
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    
    'bounce-in': {
      keyframes: {
        '0%': { opacity: 0, transform: 'scale(0.8)' },
        '50%': { transform: 'scale(1.05)' },
        '100%': { opacity: 1, transform: 'scale(1)' },
      },
      duration: '500ms',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    
    'float': {
      keyframes: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-10px)' },
      },
      duration: '3s',
      easing: 'ease-in-out',
    },
    
    'pulse-glow': {
      keyframes: {
        '0%, 100%': { boxShadow: '0 0 20px rgba(255, 105, 180, 0.2)' },
        '50%': { boxShadow: '0 0 40px rgba(255, 105, 180, 0.5)' },
      },
      duration: '2s',
      easing: 'ease-in-out',
    },
    
    'shake': {
      keyframes: {
        '0%, 100%': { transform: 'translateX(0)' },
        '25%': { transform: 'translateX(-5px)' },
        '75%': { transform: 'translateX(5px)' },
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

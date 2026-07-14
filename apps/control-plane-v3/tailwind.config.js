import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ['class'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'oklch(var(--border))',
        input: 'oklch(var(--input))',
        ring: 'oklch(var(--ring))',
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: {
          DEFAULT: 'oklch(var(--primary))',
          foreground: 'oklch(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary))',
          foreground: 'oklch(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive))',
          foreground: 'oklch(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'oklch(var(--success))',
          foreground: 'oklch(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'oklch(var(--warning))',
          foreground: 'oklch(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'oklch(var(--info))',
          foreground: 'oklch(var(--info-foreground))',
        },
        status: {
          success: {
            DEFAULT: 'oklch(var(--status-success))',
            foreground: 'oklch(var(--status-success-foreground))',
            subtle: 'oklch(var(--status-success-subtle))',
            'subtle-foreground': 'oklch(var(--status-success-subtle-foreground))',
          },
          warning: {
            DEFAULT: 'oklch(var(--status-warning))',
            foreground: 'oklch(var(--status-warning-foreground))',
            subtle: 'oklch(var(--status-warning-subtle))',
            'subtle-foreground': 'oklch(var(--status-warning-subtle-foreground))',
          },
          info: {
            DEFAULT: 'oklch(var(--status-info))',
            foreground: 'oklch(var(--status-info-foreground))',
            subtle: 'oklch(var(--status-info-subtle))',
            'subtle-foreground': 'oklch(var(--status-info-subtle-foreground))',
          },
          danger: {
            DEFAULT: 'oklch(var(--status-danger))',
            foreground: 'oklch(var(--status-danger-foreground))',
            subtle: 'oklch(var(--status-danger-subtle))',
            'subtle-foreground': 'oklch(var(--status-danger-subtle-foreground))',
          },
          brand: {
            DEFAULT: 'oklch(var(--status-brand))',
            foreground: 'oklch(var(--status-brand-foreground))',
            subtle: 'oklch(var(--status-brand-subtle))',
            'subtle-foreground': 'oklch(var(--status-brand-subtle-foreground))',
          },
        },
        muted: {
          DEFAULT: 'oklch(var(--muted))',
          foreground: 'oklch(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'oklch(var(--accent))',
          foreground: 'oklch(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'oklch(var(--popover))',
          foreground: 'oklch(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'oklch(var(--card))',
          foreground: 'oklch(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '3xl': '24px',
        '4xl': '32px',
      },
      zIndex: {
        background: '-10',
        base: '0',
        sticky: '30',
        drawer: '40',
        dropdown: '50',
        modal: '60',
        toast: '70',
        skip: '80',
      },
      animation: {
        'slide-up': 'slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

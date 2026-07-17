import tailwindcssAnimate from 'tailwindcss-animate';

const withOpacity = (variable) => `oklch(var(${variable}) / <alpha-value>)`;

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
        border: withOpacity('--border'),
        input: withOpacity('--input'),
        ring: withOpacity('--ring'),
        background: withOpacity('--background'),
        foreground: withOpacity('--foreground'),
        primary: {
          DEFAULT: withOpacity('--primary'),
          foreground: withOpacity('--primary-foreground'),
        },
        secondary: {
          DEFAULT: withOpacity('--secondary'),
          foreground: withOpacity('--secondary-foreground'),
        },
        destructive: {
          DEFAULT: withOpacity('--destructive'),
          foreground: withOpacity('--destructive-foreground'),
        },
        success: {
          DEFAULT: withOpacity('--success'),
          foreground: withOpacity('--success-foreground'),
        },
        warning: {
          DEFAULT: withOpacity('--warning'),
          foreground: withOpacity('--warning-foreground'),
        },
        info: {
          DEFAULT: withOpacity('--info'),
          foreground: withOpacity('--info-foreground'),
        },
        status: {
          success: {
            DEFAULT: withOpacity('--status-success'),
            foreground: withOpacity('--status-success-foreground'),
            subtle: withOpacity('--status-success-subtle'),
            'subtle-foreground': withOpacity('--status-success-subtle-foreground'),
          },
          warning: {
            DEFAULT: withOpacity('--status-warning'),
            foreground: withOpacity('--status-warning-foreground'),
            subtle: withOpacity('--status-warning-subtle'),
            'subtle-foreground': withOpacity('--status-warning-subtle-foreground'),
          },
          info: {
            DEFAULT: withOpacity('--status-info'),
            foreground: withOpacity('--status-info-foreground'),
            subtle: withOpacity('--status-info-subtle'),
            'subtle-foreground': withOpacity('--status-info-subtle-foreground'),
          },
          danger: {
            DEFAULT: withOpacity('--status-danger'),
            foreground: withOpacity('--status-danger-foreground'),
            subtle: withOpacity('--status-danger-subtle'),
            'subtle-foreground': withOpacity('--status-danger-subtle-foreground'),
          },
          brand: {
            DEFAULT: withOpacity('--status-brand'),
            foreground: withOpacity('--status-brand-foreground'),
            subtle: withOpacity('--status-brand-subtle'),
            'subtle-foreground': withOpacity('--status-brand-subtle-foreground'),
          },
        },
        muted: {
          DEFAULT: withOpacity('--muted'),
          foreground: withOpacity('--muted-foreground'),
        },
        accent: {
          DEFAULT: withOpacity('--accent'),
          foreground: withOpacity('--accent-foreground'),
        },
        popover: {
          DEFAULT: withOpacity('--popover'),
          foreground: withOpacity('--popover-foreground'),
        },
        card: {
          DEFAULT: withOpacity('--card'),
          foreground: withOpacity('--card-foreground'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      zIndex: {
        toast: '70',
        skip: '80',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

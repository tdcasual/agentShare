/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Kawaii color palette - kept for compatibility
        kw: {
          primary: {
            50: '#FFF0F5',
            100: '#FFE4E1',
            200: '#FFC0CB',
            300: '#FFB6C1',
            400: '#FF69B4',
            500: '#FF1493',
            600: '#DB7093',
          },
          mint: '#98FB98',
          sky: '#87CEEB',
          lavender: '#E6E6FA',
          peach: '#FFDAB9',
          lemon: '#FFFACD',
        },
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'soft': '0 1px 8px rgba(0, 0, 0, 0.05)',
        'medium': '0 2px 16px rgba(0, 0, 0, 0.06)',
        'glow': '0 0 12px rgba(0, 0, 0, 0.06)',
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
        'float': 'float 4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 0, 0, 0.04)' },
          '50%': { boxShadow: '0 0 14px rgba(0, 0, 0, 0.08)' },
        },
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
  plugins: [],
};

export default config;

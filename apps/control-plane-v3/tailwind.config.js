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
        // Kawaii color palette
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
        'soft': '0 4px 20px rgba(255, 105, 180, 0.15)',
        'medium': '0 8px 30px rgba(255, 105, 180, 0.2)',
        'glow': '0 0 20px rgba(255, 105, 180, 0.4)',
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
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 105, 180, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 105, 180, 0.5)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

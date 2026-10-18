/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',    // 👈 ADD THIS LINE
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        amir: {
          pink:   '#FFB6C1',
          blue:   '#AEE1F9',
          mint:   '#B8E6D5',
          yellow: '#FFF4B7',
          purple: '#E0BBE4',
          cream:  '#FFF9F0',
          dark:   '#2D2A32',
        }
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
      }
    },
  },
  plugins: [],
}
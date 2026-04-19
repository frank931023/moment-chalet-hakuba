import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Moment Chalet brand colors — Japanese mountain lodge aesthetic
        chalet: {
          50:  '#f5f3ef',
          100: '#e8e3d8',
          200: '#d4c9b4',
          300: '#bba98a',
          400: '#a68d68',
          500: '#8f7450',
          600: '#735c3e',
          700: '#5a4630',
          800: '#3e3022',
          900: '#241b13'
        }
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'Noto Sans TC', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        ink: '#0a0a0f',
        surface: '#111118',
        panel: '#1a1a26',
        border: '#2a2a3a',
        accent: '#c8f25a',
        muted: '#6b6b8a',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-up': 'fadeUp 0.5s ease forwards',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        scan: { '0%': { transform: 'translateY(0%)' }, '100%': { transform: 'translateY(400%)' } },
      }
    },
  },
  plugins: [],
}

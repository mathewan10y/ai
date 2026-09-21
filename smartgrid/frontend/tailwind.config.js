/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        grid: {
          bg: '#0a0d14',
          card: 'rgba(15, 23, 42, 0.75)',
          border: 'rgba(51, 65, 85, 0.5)',
          glow: '#00f5a0',
          accent: '#38bdf8',
          solar: '#facc15',
          prosumer: '#10b981',
          consumer: '#f97316',
          utility: '#06b6d4',
          danger: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'glow-orange': '0 0 25px -5px rgba(249, 115, 22, 0.4)',
        'glow-cyan': '0 0 30px -5px rgba(6, 182, 212, 0.5)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}

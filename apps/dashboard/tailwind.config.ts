import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        'logo-blue': {
          from: '#6366f1',
          to: '#8b5cf6',
        },
        'logo-yellow': {
          from: '#eab308',
          to: '#84cc16',
        },
        'logo-red': {
          from: '#ef4444',
          to: '#f97316',
        },
      },
      backgroundImage: {
        'dots-light':
          'radial-gradient(rgba(0, 0, 0, 0.3) 1.4px, transparent 1.4px)',
        'dots-dark':
          'radial-gradient(rgba(255, 255, 255, 0.3) 1.4px, transparent 1.4px)',
      },
      backgroundSize: {
        dots: '32px 32px',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
export default config

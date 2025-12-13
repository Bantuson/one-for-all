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
        // Semantic colors from CSS variables
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Chart colors
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // Traffic light colors
        traffic: {
          red: 'hsl(var(--traffic-red))',
          yellow: 'hsl(var(--traffic-yellow))',
          green: 'hsl(var(--traffic-green))',
        },
        // Syntax highlighting colors (for code-style UI)
        syntax: {
          key: 'hsl(var(--syntax-key))',
          'key-alt': 'hsl(var(--syntax-key-alt))',
          string: 'hsl(var(--syntax-string))',
          number: 'hsl(var(--syntax-number))',
          comment: 'hsl(var(--syntax-comment))',
          command: 'hsl(var(--syntax-command))',
          export: 'hsl(var(--syntax-export))',
          from: 'hsl(var(--syntax-from))',
          dollar: 'hsl(var(--syntax-dollar))',
        },
        // Sidebar colors
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Letterman brand colors (preserved for logo)
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
        // Amber accent scale for direct usage
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#c9a76c',  // Our primary amber
          600: '#a68b4d',
          700: '#8b7355',
          800: '#6b5b47',
          900: '#4a3f31',
          950: '#2d2620',
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
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
export default config

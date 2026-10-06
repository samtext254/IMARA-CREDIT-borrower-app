import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0f0d',
          900: '#111815',
          800: '#1a221e',
          700: '#2a332e',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
          200: '#e5e7eb',
          100: '#f3f4f6',
        },
        // Brand = ZENKA YELLOW (Supernova)
        brand: {
          50:  '#fffef0',
          100: '#fffbc7',
          200: '#fff48a',
          300: '#ffea4d',
          400: '#ffdf1a',
          500: '#ffce07',   // ← Zenka Supernova
          600: '#e6b800',
          700: '#b38f00',
          800: '#8a6e00',
          900: '#665200',
        },
        // Plum = ZENKA PURPLE (chrome, nav, dark surfaces)
        plum: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#8b3fbf',
          700: '#6d28a1',   // ← Zenka purple (nav, dark bg)
          800: '#5b2e8c',   // ← deeper variant
          900: '#3f1f63',
        },
        leaf: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        page: '#f7f8f7',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)',
        sheet: '0 -8px 24px rgba(0,0,0,.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
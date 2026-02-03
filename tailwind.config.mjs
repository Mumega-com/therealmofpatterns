/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: ['class', '[data-mode="kasra"]', '[data-mode="river"]'],
  theme: {
    extend: {
      // =====================
      // KASRA MODE (Brutalist)
      // =====================
      colors: {
        kasra: {
          bg: '#0a0a0a',
          surface: '#141414',
          border: '#2a2a2a',
          text: '#e0e0e0',
          muted: '#666666',
          accent: '#00ff88',
          warning: '#ffaa00',
          critical: '#ff4444',
        },
        // =====================
        // RIVER MODE (Alchemical)
        // =====================
        river: {
          // Nigredo (0.00-0.25)
          nigredo: {
            bg: '#0a0a12',
            surface: '#1a1a24',
            text: '#8888aa',
            accent: '#4a4a6a',
          },
          // Albedo (0.25-0.50)
          albedo: {
            bg: '#1a1a24',
            surface: '#2a2a3a',
            text: '#c0c0d0',
            accent: '#8888bb',
          },
          // Citrinitas (0.50-0.75)
          citrinitas: {
            bg: '#1a1812',
            surface: '#2a2418',
            text: '#e8e0d0',
            accent: '#d4a854',
          },
          // Rubedo (0.75-1.00)
          rubedo: {
            bg: '#1a1214',
            surface: '#2a1a1c',
            text: '#f0e8e8',
            accent: '#d45454',
          },
        },
        // =====================
        // SOL MODE (Warm Minimal)
        // =====================
        sol: {
          bg: '#faf8f5',
          surface: '#ffffff',
          border: '#e8e4de',
          text: '#2c2c2c',
          muted: '#6b6b6b',
          accent: '#d4a373',
          positive: '#7cb66e',
          gentle: '#b4a7d6',
          // Dark variant
          dark: {
            bg: '#1a1816',
            surface: '#242220',
            border: '#3a3632',
            text: '#f0ece4',
            muted: '#a09888',
          },
        },
      },
      fontFamily: {
        // Kasra - Monospace
        kasra: ['Geist Mono', 'SF Mono', 'ui-monospace', 'monospace'],
        // River - Serif
        river: ['Cormorant Garamond', 'Georgia', 'serif'],
        // Sol - Sans-serif
        sol: ['Inter', 'SF Pro', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Kasra type scale
        'kasra-display': ['2rem', { lineHeight: '1.2', fontWeight: '300' }],
        'kasra-h1': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'kasra-h2': ['1.125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'kasra-body': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'kasra-caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
        'kasra-data': ['2rem', { lineHeight: '1', fontWeight: '300' }],
        // River type scale
        'river-display': ['2.5rem', { lineHeight: '1.2', fontWeight: '300' }],
        'river-h1': ['2rem', { lineHeight: '1.3', fontWeight: '400' }],
        'river-h2': ['1.5rem', { lineHeight: '1.4', fontWeight: '400' }],
        'river-body': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'river-quote': ['1.25rem', { lineHeight: '1.5', fontWeight: '300', fontStyle: 'italic' }],
        'river-caption': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
        // Sol type scale
        'sol-display': ['1.75rem', { lineHeight: '1.3', fontWeight: '500' }],
        'sol-h1': ['1.375rem', { lineHeight: '1.4', fontWeight: '600' }],
        'sol-h2': ['1.125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'sol-body': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'sol-caption': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        kasra: '0px',
        river: '16px',
        sol: '8px',
      },
      animation: {
        'breathe': 'breathe 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 300ms ease-out',
        'scan': 'scan 1s linear infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '100% 0' },
        },
      },
      transitionDuration: {
        kasra: '100ms',
        river: '500ms',
        sol: '300ms',
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: '#0F4C75',
          dark: '#0A3A5C',
          light: '#1E6BA8',
          pale: '#E8F2FA',
        },
        // Secondary Colors
        secondary: {
          slate: '#475569',
          gray: '#64748B',
          light: '#94A3B8',
          pale: '#F8FAFC',
        },
        // Accent Colors
        accent: {
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          purple: '#8B5CF6',
          indigo: '#6366F1',
        },
        // Button Colors
        button: {
          'primary-cta': '#1E6BA8',
          'primary-cta-hover': '#2563EB',
          'primary': '#0F4C75',
          'primary-hover': '#0A3A5C',
          'success': '#10B981',
          'success-hover': '#059669',
          'success-light': '#D1FAE5',
          'warning': '#F59E0B',
          'warning-hover': '#D97706',
          'warning-light': '#FEF3C7',
          'accent': '#8B5CF6',
          'accent-hover': '#7C3AED',
          'accent-light': '#EDE9FE',
        },
        // Semantic Colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Neutral Palette
        neutral: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Monaco', 'Consolas', 'monospace'],
        display: ['"Cal Sans"', 'Inter', 'sans-serif'],
      },
      fontSize: {
        // Display (~15% smaller)
        'display': ['48px', { lineHeight: '54px', letterSpacing: '-0.02em', fontWeight: '700' }],
        // Headings (~15% smaller)
        'h1': ['30px', { lineHeight: '38px', letterSpacing: '-0.018em', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '30px', letterSpacing: '-0.016em', fontWeight: '600' }],
        'h3': ['19px', { lineHeight: '24px', letterSpacing: '-0.014em', fontWeight: '600' }],
        'h4': ['16px', { lineHeight: '20px', letterSpacing: '-0.012em', fontWeight: '600' }],
        'h5': ['14px', { lineHeight: '18px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h6': ['12px', { lineHeight: '16px', letterSpacing: '0em', fontWeight: '600' }],
        // Body (~15% smaller)
        'body-lg': ['14px', { lineHeight: '20px', letterSpacing: '0em', fontWeight: '400' }],
        'body': ['12px', { lineHeight: '18px', letterSpacing: '0em', fontWeight: '400' }],
        'body-sm': ['11px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '400' }],
        'caption': ['10px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '400' }],
        'tiny': ['9px', { lineHeight: '12px', letterSpacing: '0.02em', fontWeight: '400' }],
      },
      spacing: {
        '0': '0px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 250ms cubic-bezier(0.0, 0, 0.2, 1)',
        'fade-out': 'fadeOut 200ms cubic-bezier(0.4, 0, 1, 1)',
        'slide-in': 'slideIn 350ms cubic-bezier(0.0, 0, 0.2, 1)',
        'slide-out': 'slideOut 250ms cubic-bezier(0.4, 0, 1, 1)',
        'scale-in': 'scaleIn 250ms cubic-bezier(0.0, 0, 0.2, 1)',
        'scale-out': 'scaleOut 200ms cubic-bezier(0.4, 0, 1, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(16px)', opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.6, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        'instant': '75ms',
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
        'slower': '500ms',
      },
    },
  },
  plugins: [],
};

export default config;
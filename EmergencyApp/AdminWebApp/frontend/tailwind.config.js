/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SALBA Color System
        salba: {
          'navy': '#0F172A',
          'blue-primary': '#1D4ED8',
          'blue-accent': '#2563EB',
          'bg': '#F8FAFC',
          'surface': '#FFFFFF',
          'border': '#E2E8F0',
          'text-primary': '#0F172A',
          'text-secondary': '#475569',
          'critical': '#DC2626',
          'high': '#F97316',
          'medium': '#EAB308',
          'low': '#16A34A',
          'success': '#16A34A',
          'info': '#0EA5E9',
        },
        brand: {
          DEFAULT: '#CC3A18',
          dark: '#A82A10',
          light: 'rgba(204, 58, 24, 0.1)',
        }
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'barlow': ['"Barlow Condensed"', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'input': '12px',
        'button': '10px',
      },
      spacing: {
        // 8px spacing system
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(15, 23, 42, 0.08)',
        'card': '0 4px 6px rgba(15, 23, 42, 0.07)',
        'input': '0 1px 2px rgba(15, 23, 42, 0.05)',
      },
    },
  },
  plugins: [],
};

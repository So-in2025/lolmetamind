// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'lol-gold': {
          DEFAULT: '#C89B3C',
          dark: '#785A28',
          light: '#F0E6D2',
        },
        'lol-blue': {
          dark: '#010A13',
          medium: '#0A1428',
          accent: '#0BC6E3',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Roboto', 'sans-serif'],
      },
      textShadow: {
        'default': '0 2px 4px rgba(0, 0, 0, 0.5)',
        'md': '0 4px 8px rgba(0, 0, 0, 0.7)',
        'lg': '0 6px 12px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [
    require('tailwindcss-textshadow'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
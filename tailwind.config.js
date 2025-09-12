/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./tabs/*.{ts,tsx}",
    "./popup/*.{ts,tsx}",
    "./**/*.tsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['Monaco', 'Consolas', 'Lucida Console', 'monospace'],
      },
      colors: {
        'purple': {
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        }
      }
    },
  },
  plugins: [],
}
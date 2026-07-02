/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6d28d9',
          soft: '#8b5cf6',
        },
      },
    },
  },
  plugins: [],
};

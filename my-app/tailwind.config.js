/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{ts,tsx,js,jsx}',       // all pages and components in app
    './src/components/**/*.{ts,tsx,js,jsx}' // all shared components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
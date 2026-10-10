/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#17372c',
          50: '#f3f6f3',
          100: '#e3e9e4',
          200: '#c8d4ca',
          300: '#a2b6a6',
          400: '#78927f',
          500: '#5a7561',
          600: '#465d4c',
          700: '#384a3d',
          800: '#2e3c33',
          900: '#26312a',
          950: '#151c18'
        },
        ona: {
          50: '#fbf8ef',
          100: '#f5edd7',
          200: '#ead9a9',
          300: '#ddbf72',
          400: '#d3a547',
          500: '#c8932d',
          600: '#ad7322',
          700: '#8b541f',
          800: '#734421',
          900: '#61391f'
        },
        deep: '#1f4f73',
        sand: '#f7f3eb',
        gold: '#c8963e',
        mist: '#eef4f7',
        slatepro: '#0f172a'
      },
      fontFamily: {
        display: ['Nunito Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Nunito Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        adminDisplay: ['Georgia', 'Cambria', 'Times New Roman', 'serif']
      },
      boxShadow: {
        soft: '0 18px 45px rgba(15,23,42,.10)',
        card: '0 16px 30px rgba(15,23,42,.08)'
      },
    }
  },
  plugins: []
};

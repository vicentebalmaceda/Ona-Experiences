/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#17372c',
        deep: '#1f4f73',
        sand: '#f7f3eb',
        gold: '#c8963e',
        mist: '#eef4f7',
        slatepro: '#0f172a'
      },
      fontFamily: {
        display: ['Nunito Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Nunito Sans', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 45px rgba(15,23,42,.10)',
        card: '0 16px 30px rgba(15,23,42,.08)'
      },
      backgroundImage: {
        hero: "linear-gradient(90deg, rgba(9,18,28,.78) 0%, rgba(12,24,22,.55) 50%, rgba(12,24,22,.25) 100%), url('/assets/OnaExperiences.jpg')"
      }
    }
  },
  plugins: []
};

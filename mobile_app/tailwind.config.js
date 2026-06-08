/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0c1c48',
          50: '#e8ecf5',
          100: '#c5ceea',
          200: '#9eaedd',
          300: '#768dcf',
          400: '#5a75c6',
          500: '#3e5dbc',
          600: '#3856b5',
          700: '#2f4cab',
          800: '#2742a2',
          900: '#1a3193',
          950: '#0c1c48',
        },
        secondary: {
          DEFAULT: '#805522',
          50: '#fdf3e7',
          100: '#fae1c3',
          200: '#f6cd9b',
          300: '#f2b872',
          400: '#efa851',
          500: '#ec9930',
          600: '#ea912b',
          700: '#e78624',
          800: '#e47c1e',
          900: '#df6b13',
          950: '#805522',
        },
        ugest: {
          background: '#fbf8fd',
          surface: '#ffffff',
          'dark-background': '#0d0f14',
          'dark-surface': '#111318',
        },
      },
      fontFamily: {
        'montserrat': ['Montserrat_700Bold'],
        'montserrat-extrabold': ['Montserrat_800ExtraBold'],
        'inter': ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-bold': ['Inter_700Bold'],
        'inter-extrabold': ['Inter_800ExtraBold'],
      },
    },
  },
  plugins: [],
};

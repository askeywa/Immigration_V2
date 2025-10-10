/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class', // Enable class-based dark mode
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444', // Main red
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#450a0a',
          },
          cream: {
            50: '#fefdfb',
            100: '#fef9f3',
            200: '#fdf2e7',
            300: '#fbe8d4', // Main cream background
            400: '#f7d4af',
            500: '#f2bb7a',
            600: '#eda145',
            700: '#e8871e',
            800: '#c26d1a',
            900: '#9c5819',
          },
          dark: {
            50: '#f6f6f6',
            100: '#e7e7e7',
            200: '#d1d1d1',
            300: '#b0b0b0',
            400: '#888888',
            500: '#6d6d6d',
            600: '#5d5d5d',
            700: '#4f4f4f',
            800: '#454545',
            900: '#3d3d3d', // Main dark text
            950: '#1a1a1a', // Darkest
          }
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          heading: ['Nunito', 'system-ui', 'sans-serif'],
        },
        borderRadius: {
          'lg': '0.75rem',
          'xl': '1rem',
          '2xl': '1.5rem',
        },
        boxShadow: {
          'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
          'soft-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 20px 40px -5px rgba(0, 0, 0, 0.04)',
        }
      },
    },
    plugins: [],
  }
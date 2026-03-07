/** @type { import('tailwindcss').Config } */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#1A1C1E',
        surface: '#2D3035',
        accent: '#C62828',
        'accent-dim': 'rgba(198, 40, 40, 0.8)',
      },
    },
  },
  plugins: [],
};

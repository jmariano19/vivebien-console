/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        chamomile: '#F5F0E8',
        barro: {
          DEFAULT: '#C4613A',
          hover: '#A84E2E',
          light: '#E8C4B4',
        },
        sancocho: {
          DEFAULT: '#E8B84A',
          subtle: '#F5E6C4',
        },
        ebano: '#3D2E1E',
        success: '#5C8A4D',
        warning: '#E8B84A',
        error: '#C45C4A',
        info: '#5B7B8C',
        'text-primary': '#3D2E1E',
        'text-secondary': '#6B5D4D',
        'text-muted': '#8C7B6A',
      },
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        body: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(61, 46, 30, 0.08)',
        elevated: '0 8px 24px rgba(61, 46, 30, 0.12)',
      },
    },
  },
  plugins: [],
};

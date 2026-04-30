import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './context/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ember: { DEFAULT: '#ff4500' },
      },
    },
  },
  plugins: [],
};

export default config;

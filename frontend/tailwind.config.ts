import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slateDark: '#0B0F19',
        cardDark: '#111827',
        borderDark: '#1F2937',
        paypalBlue: '#0070BA',
        paypalDark: '#003087',
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f6",
          100: "#d9efe6",
          200: "#b3dfcd",
          300: "#82c9ac",
          400: "#4fac87",
          500: "#2f8f6c",
          600: "#237257",
          700: "#1e5b47",
          800: "#1a483a",
          900: "#173c31",
        },
      },
    },
  },
  plugins: [],
};

export default config;

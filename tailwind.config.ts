import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#8B5CF6",
          50: "#F5F3FF",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
        }
      }
    },
  },
  plugins: [],
};
export default config;

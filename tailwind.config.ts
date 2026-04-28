import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#10141f",
        mist: "#f5f7fb",
        line: "#d9deea",
        accent: "#1d9a8a",
        coral: "#f36b5f",
        gold: "#c4933f"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(16, 20, 31, 0.12)"
      }
    },
  },
  plugins: [],
};

export default config;

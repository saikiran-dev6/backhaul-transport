import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f2742",
        brand: { 50: "#eef7ff", 100: "#d9edff", 200: "#b8ddff", 300: "#83c4fb", 500: "#1783dd", 600: "#0d6fc2", 700: "#0c5999", 800: "#124a78", 900: "#113a5c" },
        eco: { 50: "#edfff6", 100: "#cef8e2", 500: "#20a96b", 600: "#168c57", 700: "#137146" },
        sun: { 400: "#ffb52e", 500: "#f59c13" }
      },
      boxShadow: { soft: "0 18px 55px rgba(15, 39, 66, 0.10)" },
      borderRadius: { "4xl": "2rem" },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0f",
        panel: "#14141b",
        edge: "#23232e",
      },
    },
  },
  plugins: [],
} satisfies Config;

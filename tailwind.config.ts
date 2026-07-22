import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      colors: {
        accent: "var(--accent)",
        secondary: "var(--secondary)",
        error: "var(--error)",
        info: "var(--info)",
        background: "var(--background)",
        onBackground: "var(--on-background)",
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        surfaceAlt: "var(--surface-alt)",
        text: "var(--text)",
        textMuted: "var(--text-muted)",
        border: "var(--border)",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;

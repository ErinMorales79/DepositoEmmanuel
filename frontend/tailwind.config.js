/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "selector", // usa la clase .dark en <html>
  theme: {
    extend: {
      colors: {
        // Se resuelven desde variables CSS (ver src/index.css .dark / .light)
        app: "rgb(var(--c-app) / <alpha-value>)",
        surface: {
          0: "rgb(var(--c-surface-0) / <alpha-value>)",
          1: "rgb(var(--c-surface-1) / <alpha-value>)",
          2: "rgb(var(--c-surface-2) / <alpha-value>)",
        },
        ink: {
          1: "rgb(var(--c-ink-1) / <alpha-value>)",
          2: "rgb(var(--c-ink-2) / <alpha-value>)",
          3: "rgb(var(--c-ink-3) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--c-accent) / <alpha-value>)",
          hover: "rgb(var(--c-accent-hover) / <alpha-value>)",
          ink: "rgb(var(--c-accent-ink) / <alpha-value>)",
        },
        // Acento seguro para texto/íconos sobre superficies (adapta en claro)
        brand: "rgb(var(--c-brand) / <alpha-value>)",
        pos: "rgb(var(--c-pos) / <alpha-value>)",
        neg: "rgb(var(--c-neg) / <alpha-value>)",
        line: "var(--c-line)",
        "line-strong": "var(--c-line-strong)",
      },
      fontFamily: {
        display: ['"General Sans"', '"Satoshi"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: { card: "20px", control: "12px", pill: "999px" },
      letterSpacing: { tightish: "-0.02em", label: "0.04em" },
      boxShadow: {
        glow: "0 0 0 4px rgb(var(--c-accent) / 0.16), 0 0 24px 6px rgb(var(--c-accent) / 0.40)",
        card: "var(--card-shadow)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { "fade-up": "fade-up .35s ease both" },
    },
  },
  plugins: [],
};

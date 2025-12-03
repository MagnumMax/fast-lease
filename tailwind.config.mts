import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class", "html"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./ui/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
  ],
  blocklist: ["[-:T.Z]"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sidebar: "var(--sidebar)",
        header: "var(--header)",
        card: "var(--card)",
        surface: {
          DEFAULT: "var(--surface)",
          subtle: "var(--surface-subtle)",
          elevated: "var(--surface-elevated)",
        },
        border: "var(--border)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        brand: {
          25: "var(--brand-25)",
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)",
        },
        slate: {
          50: "var(--slate-50)",
          100: "var(--slate-100)",
          200: "var(--slate-200)",
          300: "var(--slate-300)",
          400: "var(--slate-400)",
          500: "var(--slate-500)",
          600: "var(--slate-600)",
          700: "var(--slate-700)",
          800: "var(--slate-800)",
          900: "var(--slate-900)",
        },
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      ringColor: {
        DEFAULT: "var(--accent)",
      },
      ringOffsetColor: {
        DEFAULT: "var(--background)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans],
        mono: [...defaultTheme.fontFamily.mono],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "calc(var(--radius-lg) - 2px)",
        sm: "calc(var(--radius-lg) - 4px)",
        xl: "calc(var(--radius-lg) + 4px)",
      },
      boxShadow: {
        linear: "0 24px 64px -32px rgba(37, 99, 235, 0.45)",
        subtle: "0 20px 45px -40px rgba(15, 23, 42, 0.9)",
        outline: "0 0 0 1px rgba(148, 163, 184, 0.18)",
      },
      backgroundImage: {
        "linear-radial":
          "radial-gradient(circle at top left, rgba(37, 99, 235, 0.35) 0%, rgba(11, 15, 26, 0) 65%), radial-gradient(circle at bottom right, rgba(37, 99, 235, 0.15) 0%, rgba(11, 15, 26, 0) 55%)",
        "noise-surface": "var(--noise-surface)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
      },
      zIndex: {
        header: "40",
        sidebar: "50",
        nav: "60",
        overlay: "80",
      },
      transitionTimingFunction: {
        "enter": "cubic-bezier(0.16, 1, 0.3, 1)",
        "exit": "cubic-bezier(0.7, 0, 0.84, 0)",
      },
      animation: {
        "theme-fade": "theme-fade 0.3s ease-in-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "dialog-overlay-show": "dialog-overlay-show 0.3s ease-in-out",
        "dialog-content-show": "dialog-content-show 0.3s ease-in-out",
      },
      keyframes: {
        "theme-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "dialog-overlay-show": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "dialog-content-show": {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.95)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

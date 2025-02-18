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
        // Primary brand colors
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // Secondary accent colors
        secondary: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75",
          950: "#4a044e",
        },
        // Neutral colors for text and backgrounds
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        // Success colors
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        // Error colors
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
        // Warning colors
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
      },
      spacing: {
        // Custom spacing scale
        "4xs": "0.125rem", // 2px
        "3xs": "0.25rem",  // 4px
        "2xs": "0.375rem", // 6px
        xs: "0.5rem",      // 8px
        sm: "0.75rem",     // 12px
        md: "1rem",        // 16px
        lg: "1.25rem",     // 20px
        xl: "1.5rem",      // 24px
        "2xl": "2rem",     // 32px
        "3xl": "2.5rem",   // 40px
        "4xl": "3rem",     // 48px
      },
      borderRadius: {
        // Custom border radius scale
        xs: "0.125rem",    // 2px
        sm: "0.25rem",     // 4px
        md: "0.375rem",    // 6px
        lg: "0.5rem",      // 8px
        xl: "0.75rem",     // 12px
        "2xl": "1rem",     // 16px
        "3xl": "1.5rem",   // 24px
      },
      fontSize: {
        // Custom font size scale
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }],   // 10px
        xs: ["0.75rem", { lineHeight: "1rem" }],          // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }],      // 14px
        base: ["1rem", { lineHeight: "1.5rem" }],         // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }],      // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }],       // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }],        // 24px
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],   // 30px
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],     // 36px
      },
      fontFamily: {
        // Custom font families
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        // Custom animations
        "fade-in": "fadeIn 0.2s ease-in-out",
        "fade-out": "fadeOut 0.2s ease-in-out",
        "slide-in": "slideIn 0.2s ease-out",
        "slide-out": "slideOut 0.2s ease-in",
        "scale-in": "scaleIn 0.2s ease-out",
        "scale-out": "scaleOut 0.2s ease-in",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideOut: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-10px)", opacity: "0" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        scaleOut: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

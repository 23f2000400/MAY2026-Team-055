/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        body: ['"Outfit"', "sans-serif"],
        mono: ['"Space Mono"', "monospace"],
      },
      colors: {
        saffron: {
          DEFAULT: "#E26D5C",
          hover: "#C85A4A",
          soft: "#F6D4CE",
        },
        teal: {
          DEFAULT: "#477998",
          dark: "#2F5B75",
        },
        bone: "#FBF9F6",
        charcoal: {
          DEFAULT: "#2D3142",
          soft: "#4B4F63",
        },
        sage: {
          DEFAULT: "#6A8D73",
          soft: "#D6E3D9",
        },
        ochre: {
          DEFAULT: "#F4A261",
          soft: "#FCE5CE",
        },
        subtle: "#E5E1D8",
        surface: "#FFFFFF",
        background: "#FBF9F6",
        foreground: "#2D3142",
        border: "#E5E1D8",
        input: "#E5E1D8",
        ring: "#E26D5C",
        primary: {
          DEFAULT: "#E26D5C",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F6D4CE",
          foreground: "#2D3142",
        },
        muted: {
          DEFAULT: "#F1EDE6",
          foreground: "#4B4F63",
        },
        accent: {
          DEFAULT: "#477998",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#C4453A",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#2D3142",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#2D3142",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(45, 49, 66, 0.04)",
        medium: "0 8px 24px rgba(45, 49, 66, 0.06)",
        hoverGlow: "0 12px 32px rgba(226, 109, 92, 0.14)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        pulseDot: {
          "0%,100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.5)", opacity: "0.4" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        pulseDot: "pulseDot 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

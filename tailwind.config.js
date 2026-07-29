/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        aegean: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#b7ddff",
          300: "#84c6ff",
          400: "#4aa7ff",
          500: "#1e6fd9",
          600: "#1557b0",
          700: "#12468c",
          800: "#123c73",
          900: "#12345f",
          950: "#0a1f3d",
        },
        santorini: {
          white: "#FFFFFF",
          fog: "#F4F9FF",
          sand: "#FBF6EC",
        },
      },
      fontFamily: {
        sans: ["Heebo", "Assistant", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -6px rgba(18, 70, 140, 0.18)",
        card: "0 2px 10px -2px rgba(18, 70, 140, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      animation: {
        "fade-in": "fadeIn .25s ease-out",
        "slide-up": "slideUp .3s cubic-bezier(.22,1,.36,1)",
        "pop": "pop .35s cubic-bezier(.22,1,.36,1)",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { transform: "translateY(16px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
        pop: {
          "0%": { transform: "scale(.92)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};

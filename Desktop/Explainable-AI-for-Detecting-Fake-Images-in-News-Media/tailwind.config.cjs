/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: "#101317",
          light: "#1f1f23",
          soft: "#25282d",
        },
        "soft-grey": {
          DEFAULT: "#f5f6f7",
          muted: "#dde0e4",
          dark: "#b8bcc4",
        },
        "muted-teal": {
          DEFAULT: "#4ba3a4",
          light: "#6bc0c2",
          dark: "#2a6465",
        },
        newsight: {
          primary: "#1f1f1f",
          secondary: "#4ba3a4",
          accent: "#f9f5ff",
          highlight: "#ffb347",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.5rem",
        card: "1.75rem",
      },
      boxShadow: {
        card: "0 25px 60px rgba(15, 17, 23, 0.35)",
        floating: "0 30px 40px rgba(15, 17, 23, 0.25)",
        focus: "0 0 0 3px rgba(74, 163, 164, 0.45)",
      },
      spacing: {
        section: "clamp(2rem, 4vw, 3rem)",
        "safe-top": "max(env(safe-area-inset-top), 1.25rem)",
        "safe-bottom": "max(env(safe-area-inset-bottom), 1.25rem)",
      },
      backgroundImage: {
        "gradient-hero": "linear-gradient(135deg, rgba(15, 17, 23, 0.95), rgba(74, 163, 164, 0.65))",
        "gradient-card": "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(226,229,235,0.95))",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        float: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
          "100%": { transform: "translateY(0px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      gridTemplateColumns: {
        cards: "repeat(auto-fit, minmax(260px, 1fr))",
      },
      minHeight: {
        "screen-content": "calc(100vh - 4rem)",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // light
        primary: "#0B2350",
        secondary: "#2F5A8A",
        accent: "#B08A3C",
        background: "#F3EFE6",
        sand: "#F2E6CF",
        mist: "#B9C6D6",

        // dark
        night: {
          background: "#0A1224", // deep ink navy
          surface: "#14203A",    // cards, sections (replaces sand)
          primary: "#F3EFE6",    // cream text (flipped from background)
          secondary: "#7FA3CC",  // lightened engraving blue
          accent: "#D4AF5F",     // brighter gold for contrast on navy
          muted: "#3A4A66",      // borders, ghosted details (replaces mist)
        },
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-50% - 0.5rem))" },
        },
        "step-next": {
          from: { opacity: "0", transform: "translateX(1.5rem)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "step-prev": {
          from: { opacity: "0", transform: "translateX(-1.5rem)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        "step-next": "step-next 300ms ease-out",
        "step-prev": "step-prev 300ms ease-out",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // light
        primary: "#0B2350",
        accent: "#B08A3C",
        background: "#F3EFE6",

        // dark
        night: {
          background: "#0A1224", // deep ink navy
          primary: "#F3EFE6",    // cream text (flipped from background)
          accent: "#D4AF5F",     // brighter gold for contrast on navy
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

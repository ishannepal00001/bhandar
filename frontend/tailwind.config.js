/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        // clip captions on the video; Noto covers Devanagari, which Montserrat lacks
        caption: ["Montserrat", "Noto Sans Devanagari", "Impact", "Arial Narrow", "sans-serif"],
      },
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(0.5rem)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        indeterminate: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(300%)" },
        },
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
        "fade-in": "fade-in 200ms ease-out both",
        "fade-up": "fade-up 300ms ease-out both",
        indeterminate: "indeterminate 1.4s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "step-next": "step-next 300ms ease-out",
        "step-prev": "step-prev 300ms ease-out",
      },
    },
  },
  plugins: [],
};

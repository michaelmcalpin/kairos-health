/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        everist: {
          dark: "#0A1628",
          navy: "#0F1D32",
          "navy-light": "#162440",
          gold: "#C8A951",
          "gold-light": "#D4BC6A",
          "gold-dark": "#A68B3C",
          silver: "#94A3B8",
          "silver-light": "#CBD5E1",
          white: "#F8FAFC",
          success: "#22C55E",
          warning: "#EAB308",
          danger: "#EF4444",
          info: "#3B82F6",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};

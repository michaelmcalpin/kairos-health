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
          bg: "#050D18",
          navy: "#0F1D32",
          "navy-light": "#162440",
          gold: "#4A90D9",
          "gold-light": "#6AAAE8",
          "gold-dark": "#3A78BE",
          silver: "#C0C5CE",
          "silver-light": "#CBD5E1",
          white: "#F8FAFC",
          success: "#4A9D5B",
          warning: "#D4A843",
          danger: "#C65D5D",
          info: "#4A90D9",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};

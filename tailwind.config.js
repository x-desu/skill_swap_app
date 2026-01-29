const { withGluestackUI } = require("@gluestack-ui/nativewind-utils/withGluestackUI");

/** @type {import('tailwindcss').Config} */
module.exports = withGluestackUI({
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    safelist: [
        {
            pattern:
                /(bg|border|text|stroke|fill)-(primary|secondary|tertiary|error|success|warning|info|typography|outline|background)-(0|50|100|200|300|400|500|600|700|800|900|950|white|gray|black|error|warning|muted|success|info|light|dark)/,
        },
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    0: "#EFF6FF",
                    50: "#EFF6FF",
                    100: "#DBEAFE",
                    200: "#BFDBFE",
                    300: "#93C5FD",
                    400: "#60A5FA",
                    500: "#3B82F6",
                    600: "#2563EB",
                    700: "#1D4ED8",
                    800: "#1E40AF",
                    900: "#1E3A8A",
                    950: "#172554",
                },
            },
        },
    },
    plugins: [],
});

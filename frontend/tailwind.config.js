/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: {
                    light: "#f6f6f8",
                    dark: "#101622",
                },
                primary: {
                    DEFAULT: "#1152d4",
                    dark: "#0a3691",
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Manrope', 'sans-serif'],
            },
        },
    },
    plugins: [],
}

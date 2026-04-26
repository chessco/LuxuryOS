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
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar))",
                    foreground: "hsl(var(--sidebar-foreground))",
                },
                header: "hsl(var(--header))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                border: "hsl(var(--border))",
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

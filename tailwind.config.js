/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'quito-blue': '#003DA5',
                'quito-red': '#E4002B',
                'quito-gold': '#FFD700',
            }
        },
    },
    plugins: [],
}

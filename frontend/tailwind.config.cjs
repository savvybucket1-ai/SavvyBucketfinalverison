/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#64A1FF", // New Vibrant Blue
                secondary: "#1e293b", // Dark Slate for contrast
                accent: "#8BFCFE", // Cyan Highlight
                'brand-blue': '#64A1FF',
                'brand-grey': '#64748b',
                'bg-light': '#f8fafc',
            }
        },
    },
    plugins: [],
}

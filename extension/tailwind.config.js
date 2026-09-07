/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./sidepanel.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spaceBg: '#F8F4EA',
        panelBg: '#FFFFFF',
        cardBg: '#FFFFFF',
        cardHover: '#F1E9D7',
        
        brandPrimary: {
          DEFAULT: '#0284C7',
          hover: '#0369A1',
          light: '#E0F2FE'
        },
        brandCyan: {
          DEFAULT: '#0284C7',
          light: '#38BDF8'
        },

        darkText: '#0F172A',
        mutedText: '#475569',
        subtleText: '#64748B',

        panelBorder: '#E2D7C3',
        subtleBorder: '#ECE1CD',

        accentSuccess: '#0D9488',
        accentWarning: '#D97706',
        accentDanger: '#E11D48'
      }
    },
  },
  plugins: [],
}

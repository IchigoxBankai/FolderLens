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
        // Dynamic System Tokens (Dark & Light theme support)
        oliveBg: 'var(--bg-primary)',
        oliveSurface: 'var(--bg-surface)',
        oliveSecondary: 'var(--bg-secondary)',
        oliveElevated: 'var(--bg-elevated)',
        oliveActive: 'var(--bg-active)',
        
        olivePrimary: 'var(--olive-primary)',
        oliveLight: 'var(--olive-light)',
        oliveDeep: 'var(--olive-deep)',
        oliveHover: 'var(--olive-hover)',

        creamBright: 'var(--cream-bright)',
        creamPrimary: 'var(--cream-primary)',
        creamMuted: 'var(--cream-muted)',
        mutedGray: 'var(--muted-gray)',

        oliveBorder: 'var(--border-color)',
        oliveBorderSubtle: 'var(--border-subtle)',

        accentSuccess: 'var(--accent-success)',
        accentWarning: 'var(--accent-warning)',
        accentDanger: 'var(--accent-danger)',
        accentInfo: 'var(--accent-info)',

        // Overwrite legacy brand colors to ensure NO PURPLE / BLUE can ever render
        spaceBg: 'var(--bg-primary)',
        panelBg: 'var(--bg-surface)',
        cardBg: 'var(--bg-surface)',
        cardHover: 'var(--bg-secondary)',
        brandPrimary: {
          DEFAULT: 'var(--olive-primary)',
          hover: 'var(--olive-hover)',
          glow: 'rgba(115, 123, 69, 0.15)',
        },
        brandCyan: {
          DEFAULT: 'var(--olive-light)',
          glow: 'rgba(150, 159, 96, 0.15)',
        },
        darkText: 'var(--cream-bright)',
        mutedText: 'var(--cream-muted)',
        subtleText: 'var(--muted-gray)',
        panelBorder: 'var(--border-color)',
        subtleBorder: 'var(--border-subtle)'
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'sans-serif'],
        serif: ['Cormorant Garamond', 'DM Serif Display', 'serif'],
      },
      boxShadow: {
        'glow-olive': '0 0 20px -5px rgba(115, 123, 69, 0.2)',
        'olive-card': '0 4px 20px -2px rgba(0, 0, 0, 0.15)'
      }
    },
  },
  plugins: [],
}

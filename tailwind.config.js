/** @type {import('tailwindcss').Config} */
// LATFS Design System tokens (handoff bundle: latfs-design-system)
module.exports = {
  content: ["./public/**/*.html"],
  theme: {
    extend: {
      colors: {
        // Primary — Navy
        navy: {
          950: '#080f24',
          900: '#0f172a', // primary brand navy
          800: '#162041',
          700: '#1e3a5f', // hover/secondary
          600: '#2d4a78',
          500: '#4a6fa5',
        },
        // Accent — Academic Gold
        gold: {
          900: '#7a5e15',
          700: '#9a7820',
          600: '#b8912a', // primary gold
          500: '#d4a942',
          300: '#e8c972',
          100: '#fef7e4',
          50:  '#fdfbf4',
        },
        // Legacy aliases (keep existing markup working)
        primary:   '#0f172a',
        secondary: '#1e3a5f',
        accent:    '#b8912a',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Iowan Old Style', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    }
  },
  plugins: [],
}

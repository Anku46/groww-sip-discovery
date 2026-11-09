import type { Config } from 'tailwindcss'

/** Colors come from CSS custom properties in src/styles/tokens.css. */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: v('navy'),
        slate: { DEFAULT: v('slate'), elevated: v('slate-elevated') },
        line: v('line'),
        ink: { DEFAULT: v('ink'), muted: v('ink-muted'), faint: v('ink-faint') },
        // Okabe-Ito accents: base hue for fills/borders, "-text" tint for text on navy (WCAG AA).
        teal: { DEFAULT: v('teal'), text: v('teal-text') },
        vermilion: { DEFAULT: v('vermilion'), text: v('vermilion-text') },
        amber: { DEFAULT: v('amber'), text: v('amber-text') },
        green: { text: v('green-text') },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'slide-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        'drawer-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'slide-in': 'slide-in 280ms ease-out both',
        shimmer: 'shimmer 1.4s linear infinite',
        'drawer-in': 'drawer-in 200ms ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config

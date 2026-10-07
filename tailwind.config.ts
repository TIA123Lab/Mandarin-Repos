import type { Config } from 'tailwindcss';

const c = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: c('border'),
        input: c('input'),
        ring: c('ring'),
        background: c('background'),
        foreground: c('foreground'),
        primary: { DEFAULT: c('primary'), foreground: c('primary-foreground') },
        muted: { DEFAULT: c('muted'), foreground: c('muted-foreground') },
        card: { DEFAULT: c('card'), foreground: c('card-foreground') },
        destructive: { DEFAULT: c('destructive'), foreground: c('destructive-foreground') },
        jade: c('jade'),
        flame: c('flame'),
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 4px)', sm: 'calc(var(--radius) - 8px)' },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DEFAULT 映射到主题 CSS 变量，使 bg-primary / from-primary / border-accent 等工具类生效
        primary: {
          DEFAULT: 'var(--color-primary)',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
        },
        tech: {
          dark: '#0a0b0d',
          darker: '#050506',
          light: '#1a1b23',
          primary: '#001F3F',
          secondary: '#6366f1',
          accent: '#00d4ff',
          neon: '#00FFCC',
          purple: '#8A2BE2',
        },
        nav: {
          dark: '#050506',
          blue: '#1e3a8a',
          green: '#047857'
        },
        // 映射CSS变量到Tailwind颜色
        color: {
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          accent: 'var(--color-accent)',
          background: 'var(--color-background)',
          surface: 'var(--color-surface)',
          surfaceAlt: 'var(--color-surface-alt)',
          border: 'var(--color-text-muted)',
        },
        // 主题动态色板（themes.ts 运行时注入 --color-*-rgb 通道值；<alpha-value> 支持 bg-theme-x/60 等透明度写法）
        theme: {
          primary: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-secondary-rgb) / <alpha-value>)',
          accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          background: 'rgb(var(--color-background-rgb) / <alpha-value>)',
          surface: 'rgb(var(--color-surface-rgb) / <alpha-value>)',
          surfaceAlt: 'rgb(var(--color-surface-alt-rgb) / <alpha-value>)',
          text: 'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
          textPrimary: 'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
          textSecondary: 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)',
          textMuted: 'rgb(var(--color-text-muted-rgb) / <alpha-value>)',
          divider: 'rgb(var(--color-divider-rgb) / <alpha-value>)',
          border: 'rgb(var(--color-border-rgb) / <alpha-value>)',
        },
        semantic: {
          cta: {
            primary: 'rgb(var(--semantic-cta-primary-bg-rgb) / <alpha-value>)',
            secondary: { border: 'var(--semantic-cta-secondary-border)' },
          },
          hero: { accent: 'rgb(var(--semantic-hero-accent-rgb) / <alpha-value>)' },
          mutedBg: 'rgb(var(--semantic-muted-bg-rgb) / <alpha-value>)',
          panel: 'rgb(var(--semantic-panel-bg-rgb) / <alpha-value>)',
          panelBorder: 'rgb(var(--semantic-panel-border-rgb) / <alpha-value>)',
          tagBg: 'var(--semantic-tag-bg)',
          tagText: 'var(--semantic-tag-text)',
          dividerStrong: 'var(--semantic-divider-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        }
      },
      boxShadow: {
        semantic: '0 2px 8px rgb(0 0 0 / 0.12)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'tech-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'hero-gradient': 'linear-gradient(135deg, #0a0b0d 0%, #1a1b23 50%, #0a0b0d 100%)',
        'tech-futuristic-gradient': 'linear-gradient(135deg, #001F3F 0%, #00D4FF 50%, #8A2BE2 100%)',
        'tech-accent-gradient': 'linear-gradient(135deg, #00D4FF 0%, #8A2BE2 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-glow': 'borderGlow 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          'from': { boxShadow: '0 0 20px #00d4ff' },
          'to': { boxShadow: '0 0 30px #00d4ff, 0 0 40px #00d4ff' },
        },
        borderGlow: {
          '0%, 100%': { boxShadow: '0 0 5px #00d4ff, 0 0 10px #00d4ff' },
          '50%': { boxShadow: '0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 30px #00d4ff' },
        },
        slideUp: {
          'from': { transform: 'translateY(100%)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
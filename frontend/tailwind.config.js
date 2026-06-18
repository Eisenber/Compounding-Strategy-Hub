/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f5f8',
          100: '#e8e8ed',
          200: '#d1d1db',
          300: '#b0b0c0',
          400: '#8888a0',
          500: '#6b6b85',
          600: '#55556e',
          700: '#434359',
          800: '#2d2d42',
          900: '#1a1a2e',
          950: '#0f0f1d',
        },
        gold: {
          50: '#fef9f0',
          100: '#fdefd9',
          200: '#fadeb3',
          300: '#f2c57e',
          400: '#e8a84a',
          500: '#dc8e2e',
          600: '#c7731f',
          700: '#a5591c',
          800: '#85461e',
          900: '#6d3a1c',
        },
        cream: {
          50: '#FDFCFA',
          100: '#F8F6F0',
          200: '#F0ECE2',
          300: '#E5DFCF',
        },
        // Semantic data colors for financial values
        data: {
          positive: '#10b981',   // green for good values
          negative: '#ef4444',   // red for bad values
          neutral: '#6b7280',    // gray for neutral
          warning: '#f59e0b',    // amber for warning
          highlight: '#3b82f6',  // blue for highlights
        },
      },
      fontFamily: {
        display: [
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Noto Sans SC',
          'sans-serif',
        ],
        body: [
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Noto Sans SC',
          'sans-serif',
        ],
        number: [
          'SF Mono',
          'JetBrains Mono',
          'Fira Code',
          'Consolas',
          'ui-monospace',
          'monospace',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(26, 29, 46, 0.04), 0 1px 2px rgba(26, 29, 46, 0.06)',
        'card-hover':
          '0 10px 25px rgba(26, 29, 46, 0.08), 0 4px 10px rgba(26, 29, 46, 0.04)',
        'card-elevated':
          '0 20px 40px rgba(26, 29, 46, 0.06), 0 8px 16px rgba(26, 29, 46, 0.04)',
        glow: '0 0 24px rgba(220, 142, 46, 0.2)',
        'glow-sm': '0 0 12px rgba(220, 142, 46, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};

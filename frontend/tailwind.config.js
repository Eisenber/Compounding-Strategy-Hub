/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f4f6',
          100: '#e4e5ea',
          200: '#c8cad4',
          300: '#a1a4b5',
          400: '#73778f',
          500: '#585b74',
          600: '#4a4d63',
          700: '#3f4153',
          800: '#353747',
          900: '#1A1D2E',
          950: '#141621',
        },
        gold: {
          50: '#fdf8f0',
          100: '#f9edda',
          200: '#f2d8b3',
          300: '#e9bd82',
          400: '#de9d50',
          500: '#d4872e',
          600: '#c57023',
          700: '#b3581f',
          800: '#8f4621',
          900: '#743b1e',
        },
        cream: {
          50: '#FDFCFA',
          100: '#FBF9F4',
          200: '#F6F1E8',
          300: '#EFE6D5',
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
          'monospace',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(26, 29, 46, 0.06), 0 1px 2px rgba(26, 29, 46, 0.04)',
        'card-hover':
          '0 4px 16px rgba(26, 29, 46, 0.08), 0 2px 4px rgba(26, 29, 46, 0.04)',
        glow: '0 0 20px rgba(180, 130, 40, 0.15)',
      },
    },
  },
  plugins: [],
};

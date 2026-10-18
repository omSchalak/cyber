/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./api/**/*.{js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#79616f',
          light: '#917987',
          dark: '#5e4b56',
        },
        mauve: {
          pale: '#E9DFE5',
          deep: '#51404B',
          light: '#F4EFF2',
        },
        bg: {
          light: '#F8F5F7',
          card: '#FFFFFF',
        },
        dark: {
          text: '#252126',
          muted: '#635B65',
        },
        border: {
          subtle: '#D7CBD2',
          bold: '#51404B',
        }
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #51404B',
        'brutal-sm': '2px 2px 0px 0px #51404B',
        'brutal-lg': '6px 6px 0px 0px #51404B',
        'brutal-xl': '8px 8px 0px 0px #51404B',
        'brutal-mauve': '4px 4px 0px 0px #79616f',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}

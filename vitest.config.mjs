import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// 独立于 vite.config.mjs，专用于单元测试
// 复用 @ 别名与 React 插件，使用 jsdom 提供 localStorage/window 等
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env': {},
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/hooks/**'],
      exclude: ['src/hooks/useDragDrop.js', 'src/hooks/useLocale.jsx'],
    },
  },
})

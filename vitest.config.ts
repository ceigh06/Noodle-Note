import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/renderer/src/test/setup.ts'],
    include: [
      'src/renderer/src/**/*.{test,spec}.{ts,tsx}',
      'src/main/**/*.{test,spec}.{ts,tsx}',
      'src/preload/**/*.{test,spec}.{ts,tsx}'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src'),
      '@renderer': path.resolve(__dirname, './src/renderer/src')
    }
  }
})

import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'renderer',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'renderer'),
    },
  },
  plugins: [react({
    jsxRuntime: 'automatic',
  })],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-zoom-pan-pinch'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})

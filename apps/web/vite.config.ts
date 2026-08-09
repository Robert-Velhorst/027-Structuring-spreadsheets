import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': 'http://127.0.0.1:8765',
      '/hai': 'http://127.0.0.1:8765',
      '/healthz': 'http://127.0.0.1:8765',
      '/readyz': 'http://127.0.0.1:8765',
    },
  },
  build: { target: 'es2022', sourcemap: true },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' },
})

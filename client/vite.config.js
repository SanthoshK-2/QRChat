import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
      events: 'events',
      stream: 'stream-browserify',
      path: 'path-browserify',
      string_decoder: 'string_decoder',
    },
  },
  define: {
    global: 'globalThis',
  },
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['buffer', 'process', 'events', 'util', 'stream-browserify', 'string_decoder'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
  },
})

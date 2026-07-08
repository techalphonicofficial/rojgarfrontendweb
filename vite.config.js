import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: 'window',
  },
  plugins: [react()],
  server: {
    port: 5178,
    strictPort: false,
    allowedHosts: [
      'writes-micro-accompanied-manufacturing.trycloudflare.com'
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})

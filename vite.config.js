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
  },
})

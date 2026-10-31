import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Let a `cloudflared tunnel --url http://localhost:5173` address through, for testing on a phone over HTTPS.
    allowedHosts: ['.trycloudflare.com'],
    // Forward API calls to the Bun backend during development.
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})

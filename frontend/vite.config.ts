import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The deployed Worker: dev, preview and production all proxy /api here, so requests are same-origin in the
// browser and the auth cookie stays first-party (Brave/Safari block it otherwise).
const API_TARGET = 'https://bhandar-backend.ishannepal00001.workers.dev'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Let a `cloudflared tunnel --url http://localhost:5173` address through, for testing on a phone over HTTPS.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': API_TARGET,
    },
  },
  preview: {
    proxy: {
      '/api': API_TARGET,
    },
  },
})

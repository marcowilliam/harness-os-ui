import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiPort = process.env.VITE_API_PORT || '3001'
const uiPort = parseInt(process.env.VITE_PORT || '5173')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: uiPort,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
      '/ws': { target: `ws://localhost:${apiPort}`, ws: true },
    },
  },
})

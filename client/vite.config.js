import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // fail loudly instead of silently moving to 5174, because the
    // server's CORS_ORIGIN expects exactly http://localhost:5173
    strictPort: true,
  },
})

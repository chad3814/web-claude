import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the web package
// https://vitejs.dev/config/
export default defineConfig({
  // Enable React plugin for JSX transformation and Fast Refresh
  plugins: [react()],

  server: {
    // Use port 5173 for development server (Vite default)
    port: 5173,
  },

  build: {
    // Output directory for production builds
    outDir: 'dist',
    // Generate sourcemaps for easier debugging in production
    sourcemap: true,
  },
})

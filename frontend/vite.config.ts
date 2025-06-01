import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'; // Import path module

export default defineConfig({
  plugins: [react()],
  resolve: { // Added resolve configuration
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // additionalData: `@import "./src/styles/variables.scss";` // Example for global variables
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,  // This will fail if port 5174 is not available
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5002',  // Match the running backend server
        changeOrigin: true,
        secure: false,
      }
    }
  }
}) 
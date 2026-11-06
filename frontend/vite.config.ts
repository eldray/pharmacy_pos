import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Served by the backend at http://127.0.0.1:5000/ with BrowserRouter, so asset
  // URLs must be absolute. A relative base breaks reloads on nested routes.
  base: '/',
  server: {
    // Bind to all interfaces so other PCs on the LAN can reach the dev server.
    // Previously 'localhost' bound only to the loopback ([::1]), which made
    // http://192.168.1.107:3000/ fail even on the host machine itself.
    host: '0.0.0.0',
    port: 3000,
    // Allow access from other LAN hosts (Vite blocks unknown Host headers by default).
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      // HMR websocket must target the host the browser actually loaded the page from,
      // otherwise hot reload breaks on remote PCs.
      host: '192.168.1.107',
      clientPort: 3000,
    },
  },
  define: {
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
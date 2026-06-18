import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  cacheDir: process.env.LOCALAPPDATA + '/vite-cache/app-car-energy',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf': ['jspdf'],
          'docx': ['docx']
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'App Car Energy',
        short_name: 'CarEnergy',
        description: 'Registro de carga y reporte de energia para coches electricos.',
        theme_color: '#2563eb',
        background_color: '#f4f7fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})

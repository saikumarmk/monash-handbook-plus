import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// PWA plugin - uncomment after running: pnpm add -D vite-plugin-pwa
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    // Uncomment after installing vite-plugin-pwa:
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.png', 'robots.txt'],
    //   manifest: {
    //     name: 'Monash Handbook Visualizer',
    //     short_name: 'Handbook',
    //     description: 'A better way to explore Monash University units, courses, and areas of study',
    //     theme_color: '#0a0f1a',
    //     background_color: '#0a0f1a',
    //     display: 'standalone',
    //     icons: [
    //       { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    //       { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    //       { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    //     ]
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^\/data\/.*\.json$/,
    //         handler: 'CacheFirst',
    //         options: {
    //           cacheName: 'handbook-data',
    //           expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }
    //         }
    //       }
    //     ]
    //   }
    // })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

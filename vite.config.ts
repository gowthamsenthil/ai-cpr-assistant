// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa'

// // https://vitejs.dev/config/
// export default defineConfig({
//   server: {
//         allowedHosts: 'all',
//   },
//   plugins: [
//     react(),
//     VitePWA({
//       registerType: 'autoUpdate',
//       includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
//       manifest: {
//         name: 'AR CPR Assistant',
//         short_name: 'CPR AR',
//         description: 'Real-time AR-guided CPR assistance using your smartphone\'s camera',
//         theme_color: '#1976d2',
//         icons: [
//           {
//             src: '/icons/icon-192x192.png',
//             sizes: '192x192',
//             type: 'image/png',
//             purpose: 'any maskable'
//           },
//           {
//             src: '/icons/icon-512x512.png',
//             sizes: '512x512',
//             type: 'image/png'
//           }
//         ]
//       },
//       workbox: {
//         globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
//       },
//       devOptions: {
//         enabled: true
//       }
//     })
//   ],
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,            // listen on all interfaces (useful for testing on phone)
    allowedHosts: true,    // ✅ allow any host (instead of 'all')
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'AR CPR Assistant',
        short_name: 'CPR AR',
        description: 'Real-time AR-guided CPR assistance using your smartphone\'s camera',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json,webmanifest}'],
        // Optional (SPA routing):
        // navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: false // Disabled in dev to avoid TypeScript errors; enable for PWA testing
      }
    })
  ],
})

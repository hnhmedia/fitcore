import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // New versions install in the background and take over on the next app open.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Keep using the hand-written manifest in /public.
      manifest: false,
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'manifest.webmanifest'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        // The account/sync API must always hit the network.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Google Fonts so the app looks right offline too.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split big libraries into their own files so they are cached separately.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) return 'icons';
          if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|lodash|react-smooth|recharts-scale|decimal\.js-light|eventemitter3|internmap|fast-equals|tiny-invariant|react-transition-group|dom-helpers)[\\/]/.test(id)) return 'charts';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})

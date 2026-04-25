import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'pwa-icon-source.svg', 'sounds/**'],
      manifest: {
        name: 'La Roulade Marseillaise',
        short_name: 'Roulade',
        description: 'Le jeu de défis qui claque comme un carreau sur la place du village',
        theme_color: '#0057A8',
        background_color: '#F5F5F0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'fr',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-media',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5177,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
    },
  },
});

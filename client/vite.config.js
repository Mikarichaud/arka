import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'sounds/**'],
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
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
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

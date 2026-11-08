import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { assertProductionApiUrl, BUILD_CONFIG_FILE } from './scripts/verify-production-build.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const productionApiUrl = mode === 'production' ? assertProductionApiUrl(env.VITE_API_URL) : env.VITE_API_URL;
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'luxuryos-production-config',
        generateBundle() {
          if (mode !== 'production') return;
          this.emitFile({ type: 'asset', fileName: BUILD_CONFIG_FILE, source: JSON.stringify({ apiUrl: productionApiUrl }) });
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Cared',
          short_name: 'Cared',
          description: 'Premium Jewelry Business Management Suite',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // Deliberately invalidate legacy Workbox caches that could still
          // hold an executable bundle from a deployment before this safeguard.
          cacheId: 'cared-v3-track-mobile',
          // Never precache executable bundles. A partially cached JavaScript
          // asset can fail before React is able to run its recovery handler,
          // leaving the application blank. Vite fingerprints these assets and
          // the server handles their cache lifetime safely instead.
          globPatterns: ['**/*.{ico,png,svg,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});

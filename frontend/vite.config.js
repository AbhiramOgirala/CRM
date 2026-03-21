import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.VITE_PORT || env.PORT || 3001);
  
  // Extract base URL from REACT_APP_API_URL if present, otherwise default to 5000
  let backendUrl = 'http://localhost:5000';
  if (env.VITE_BACKEND_URL) {
    backendUrl = env.VITE_BACKEND_URL;
  } else if (env.REACT_APP_API_URL) {
    backendUrl = env.REACT_APP_API_URL.replace(/\/api\/?$/, '');
  }

  return {
    plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo192.png', 'logo512.png', 'emblem.svg', 'offline.html'],
      manifest: {
        short_name: 'JanSamadhan',
        name: 'JanSamadhan - Citizen Grievance Portal',
        description: 'File civic complaints, track resolution, and hold government accountable.',
        icons: [
          { src: 'logo192.png', type: 'image/png', sizes: '192x192' },
          { src: 'logo512.png', type: 'image/png', sizes: '512x512', purpose: 'any maskable' }
        ],
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1A237E',
        background_color: '#1A237E',
        shortcuts: [
          {
            name: 'File a Complaint',
            short_name: 'File',
            description: 'Quickly file a new civic complaint',
            url: '/file-complaint',
            icons: [{ src: 'logo192.png', sizes: '192x192' }]
          },
          {
            name: 'My Complaints',
            short_name: 'My Cases',
            url: '/my-complaints',
            icons: [{ src: 'logo192.png', sizes: '192x192' }]
          },
          {
            name: 'Public Feed',
            short_name: 'Feed',
            url: '/feed',
            icons: [{ src: 'logo192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        // Pre-cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
        // Custom service worker logic for background sync
        importScripts: ['/sw-sync.js'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-responses',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      },
      // Offline fallback page
      navigateFallback: '/offline.html',
      navigateFallbackAllowlist: [/^(?!\/(api|admin)).*/],
    })
  ],
  server: {
    port: port,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true
      }
    }
  },
  preview: {
    port: port
  },
  resolve: {
    extensions: ['.jsx', '.js', '.json']
  },
  optimizeDeps: {
    include: ['leaflet', 'leaflet.markercluster']
  }
  };
});

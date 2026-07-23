import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served at https://<user>.github.io/cataract-preop-pwa/ in production;
// local dev keeps serving from the root.
const BASE_PATH = '/cataract-preop-pwa/';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? BASE_PATH : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cataract Surgery Patient Prep',
        short_name: 'Cataract Prep',
        description: 'Offline pre-op prep tool for cataract surgery patients.',
        display: 'standalone',
        background_color: '#f7f6f9',
        theme_color: '#6b3bff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  server: { host: true },
  preview: { host: true },
}));

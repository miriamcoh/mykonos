import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Serves from the domain root - correct for Vercel (and Netlify/Firebase
// Hosting). Override with BASE_PATH if a future host needs a sub-path.
export default defineConfig(() => {
  const base = process.env.BASE_PATH ?? "/";
  return {
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Manual registration in main.tsx (immediate: true) so a new deploy's
      // service worker takes over right away instead of leaving an old one
      // stuck serving its cached shell (which is what caused the blank
      // white screen after the base-path change - the browser kept serving
      // an old cached index.html that still pointed at /mykonos/ assets).
      injectRegister: false,
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        id: base,
        name: 'טסים למיקונוס',
        short_name: 'מיקונוס',
        description: "אפליקציית הטיול המשותפת שלנו למיקונוס",
        lang: "he",
        dir: "rtl",
        theme_color: "#1E6FD9",
        background_color: "#F4F9FF",
        display: "standalone",
        orientation: "portrait",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallbackDenylist: [/^\/api\//],
        // New SW activates and takes control immediately (no waiting on old
        // tabs to close), and drops any precache entries a previous deploy
        // left behind - this is what makes base-path/asset-hash changes
        // between deploys stop leaving a stale cached shell behind.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  };
});

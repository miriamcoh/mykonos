import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// GitHub Pages serves this project at /mykonos/ (a project site, not a user
// site), so every absolute asset/route reference needs that prefix. Only
// applied to production builds - `npm run dev` keeps serving at "/" for a
// plain, unprefixed http://localhost:5173. Override with BASE_PATH=/ when
// building for a host that serves from the domain root (Firebase Hosting,
// Netlify, Vercel, ...).
export default defineConfig(({ command }) => {
  const base = process.env.BASE_PATH ?? (command === "build" ? "/mykonos/" : "/");
  return {
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
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

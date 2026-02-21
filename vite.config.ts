import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

function normalizeBase(input: string): string {
  if (!input || input === "/") {
    return "/";
  }

  const withLeadingSlash = input.startsWith("/") ? input : `/${input}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function resolveGithubPagesBase(): string {
  const explicitBase = process.env.VITE_BASE_PATH;
  if (explicitBase) {
    return normalizeBase(explicitBase);
  }

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !repository.includes("/")) {
    return "/";
  }

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    return "/";
  }

  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return "/";
  }

  return normalizeBase(repo);
}

const base = resolveGithubPagesBase();

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.svg", "icons/icon-512.svg"],
      manifest: {
        name: "Suivi Ramadan - 30 Parties",
        short_name: "Suivi Ramadan",
        description: "Suivi des récitations quotidiennes des 30 parties du Coran.",
        theme_color: "#123524",
        background_color: "#f7f4e9",
        display: "standalone",
        start_url: base,
        scope: base,
        lang: "fr",
        icons: [
          {
            src: `${base}icons/icon-192.svg`,
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: `${base}icons/icon-512.svg`,
            sizes: "512x512",
            type: "image/svg+xml"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "audio",
            handler: "CacheFirst",
            options: {
              cacheName: "audio-cache",
              cacheableResponse: {
                statuses: [0, 200]
              },
              rangeRequests: true,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
      }
    })
  ]
});

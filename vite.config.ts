import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Basis-Pfad: GitHub Pages liefert das Projekt unter /denkspur/ aus.
 * Für einen anderen Host (z. B. Cloudflare Pages unter /) DENKSPUR_BASE=/ setzen.
 */
const base = process.env.DENKSPUR_BASE ?? '/denkspur/';

/**
 * Strenge Content Security Policy – nur im Produktions-Build, weil der
 * Entwicklungsserver eigene Inline-Skripte einfügt.
 * 'wasm-unsafe-eval' braucht SQLite-WASM. connect-src erweitert M3 um die KI-Anbieter.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self'",
  "font-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'denkspur-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

/** GitHub Pages kennt kein SPA-Routing: 404.html = index.html, damit z. B. /denkspur/diagnose direkt lädt. */
function spaFallbackPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'denkspur-spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    cspPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Denkspur',
        short_name: 'Denkspur',
        description: 'Dein persönliches, datiertes Gedankenarchiv – alle Daten bleiben auf dem Gerät.',
        lang: 'de',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f6f3ee',
        theme_color: '#1f3a3d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,webmanifest}'],
        globIgnores: ['404.html'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
    spaFallbackPlugin(),
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  build: {
    target: ['es2022', 'safari16'],
    sourcemap: false,
  },
});

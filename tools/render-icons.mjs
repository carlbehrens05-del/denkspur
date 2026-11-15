// Erzeugt die PNG-Icons aus dem eigenen Logo (public/favicon.svg).
// Aufruf: node tools/render-icons.mjs   (nutzt das Chromium von Playwright)
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
// Vollflächige Variante (ohne Rundung) für apple-touch-icon und maskable – iOS/Android runden selbst.
const fullBleed = svg.replace('rx="112"', 'rx="0"');
// maskable: Inhalt in die sichere Zone (inneres 80 %) verkleinern.
const maskable = fullBleed.replace(
  /<path[\s\S]*<\/svg>/,
  (m) => `<g transform="translate(76.8 76.8) scale(0.7)">${m.replace('</svg>', '')}</g></svg>`,
);

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, src: svg },
  { file: 'public/icons/icon-512.png', size: 512, src: svg },
  { file: 'public/icons/icon-maskable-512.png', size: 512, src: maskable },
  { file: 'public/apple-touch-icon.png', size: 180, src: fullBleed },
];

const browser = await chromium.launch();
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
  const html = `<html><body style="margin:0;background:transparent">${t.src.replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)}</body></html>`;
  await page.setContent(html);
  await page.screenshot({ path: t.file, omitBackground: true });
  await page.close();
  console.log('geschrieben:', t.file);
}
await browser.close();

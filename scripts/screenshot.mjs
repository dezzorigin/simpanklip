// Screenshot dokumentasi: landing desktop + mobile + hasil contoh ke
// docs/screenshots/*.png — dipakai README + video demo.
// Prasyarat: puppeteer-core, Chromium di cache
// (~/.cache/ms-playwright/chromium-1234), dan server di PORT (default 8331).
// JANGAN `npx playwright install chromium` di VM ini (menghapus cache
// browser tooling video-demo).
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import net from 'node:net';

// Forwarder egress (127.0.0.1:18081) WAJIB untuk media eksternal dari
// headless Chrome di VM ini (picsum/MDN/Google Fonts): koneksi langsung
// browser -> egress proxy ditolak 403, dan tanpa proxy media contoh tidak
// termuat. Probe TCP dulu; kalau forwarder mati, lanjut tanpa proxy tapi
// media contoh akan kosong di screenshot.
const FORWARDER = 'http://127.0.0.1:18081';
const forwarderAlive = await new Promise((resolve) => {
  const s = net.connect(18081, '127.0.0.1');
  s.once('connect', () => { s.destroy(); resolve(true); });
  s.once('error', () => resolve(false));
  setTimeout(() => { s.destroy(); resolve(false); }, 2000);
});
if (!forwarderAlive) console.warn('PERINGATAN: forwarder 127.0.0.1:18081 mati — media contoh mungkin kosong.');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'screenshots');
const PORT = process.env.PORT || '8331';
const BASE = `http://127.0.0.1:${PORT}`;

const require = createRequire(import.meta.url);
let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  try {
    puppeteer = require('/home/hatch/workspace/absensirapat-audit/diag/node_modules/puppeteer-core');
  } catch {
    console.error('puppeteer-core tidak ditemukan. Pasang dulu: npm i -D puppeteer-core.');
    process.exit(1);
  }
}

mkdirSync(OUT, { recursive: true });

const exe =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  join(process.env.HOME, '.cache/ms-playwright/chromium-1234/chrome-linux/chrome');
const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage',
    ...(forwarderAlive ? [`--proxy-server=${FORWARDER}`] : [])],
});

async function shot(name, width, height, actions = async () => {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await actions(page);
  await page.screenshot({ path: join(OUT, name) });
  console.log(`shot: ${name} (${width}x${height})`);
  await page.close();
}

// Desktop: hero lengkap (alat kiri + pemutar contoh kanan).
// Tunggu metadata video contoh termuat supaya poster tampil penuh.
await shot('landing-desktop.png', 1440, 900, async (page) => {
  await page.waitForFunction(
    () => {
      const v = document.querySelector('#playerMedia video');
      return v && v.readyState >= 1;
    },
    { timeout: 30000 },
  );
});
// Desktop: hasil contoh foto (klik "contoh slide foto", tunggu slider).
await shot('hasil-foto-desktop.png', 1440, 900, async (page) => {
  await page.evaluate(() => document.getElementById('demoPhotoBtn').click());
  await page.waitForFunction(
    () => {
      const imgs = [...document.querySelectorAll('.slider-track img')];
      return imgs.length === 3 && imgs.every((i) => i.complete && i.naturalWidth > 0);
    },
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 500));
});
// Mobile 390px: hero menumpuk rapi, tanpa overflow horizontal.
await shot('landing-mobile.png', 390, 844);

await browser.close();
console.log('screenshots OK -> docs/screenshots/');

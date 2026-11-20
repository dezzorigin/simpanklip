// E2E: landing + alur unduh demo (video & foto) + validasi URL.
// Berjalan terhadap `npm run serve` (dist/ + worker lokal). Tidak menyentuh
// savett.cc — jalur resolver asli diuji unit (worker test) + live pasca-deploy.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Pratinjau contoh video dimuat otomatis saat halaman dibuka.
  await expect(page.locator('#resUsername')).toHaveText('@contoh_kreator', { timeout: 10000 });
});

test('landing: navbar, hero, dan tautan GitHub hidup', async ({ page }) => {
  await expect(page).toHaveTitle(/Simpan Klip/);
  await expect(page.locator('h1')).toHaveText('Simpan klip video favoritmu.');
  const gh = page.locator('.github-link');
  await expect(gh).toHaveAttribute('href', 'https://github.com/dezzorigin/simpanklip');
  await expect(page.locator('#urlInput')).toBeVisible();
  await expect(page.locator('#dlBtn')).toBeVisible();
  await expect(page.locator('#cara-pakai')).toBeVisible();
  await expect(page.locator('#fitur')).toBeVisible();
  await expect(page.locator('#faq')).toBeVisible();
});

test('demo video: pratinjau contoh + tombol unduh muncul', async ({ page }) => {
  await expect(page.locator('#demoBadge')).toBeVisible();
  await expect(page.locator('#demoBadge')).toHaveText('Contoh');
  await expect(page.locator('#playerMedia video')).toBeVisible();
  await expect(page.locator('#railLikes')).toHaveText('89.012');
  await expect(page.locator('#btnVideo')).toBeVisible();
  await expect(page.locator('#btnAudio')).toBeVisible();
  await expect(page.locator('#downloadBar')).toBeVisible();
});

test('demo foto: slider jalan, counter berubah, tombol foto muncul', async ({ page }) => {
  await page.locator('#demoPhotoBtn').click();
  await expect(page.locator('#slideCounter')).toHaveText('1 / 3');
  await expect(page.locator('#playerMedia .slider-track img')).toHaveCount(3);
  await expect(page.locator('#btnSlide')).toBeVisible();
  await expect(page.locator('#btnSlidesAll')).toBeVisible();
  await page.locator('#nextSlide').click();
  await expect(page.locator('#slideCounter')).toHaveText('2 / 3');
  await page.locator('#prevSlide').click();
  await expect(page.locator('#slideCounter')).toHaveText('1 / 3');
});

test('validasi: tautan kosong dan tautan yang tidak didukung ditolak inline', async ({ page }) => {
  await page.locator('#dlBtn').click();
  await expect(page.locator('#errorBox')).toBeVisible();
  await expect(page.locator('#errorBox')).toContainText('Tempel dulu');

  await page.locator('#urlInput').fill('https://www.youtube.com/watch?v=abc');
  await page.locator('#dlBtn').click();
  await expect(page.locator('#errorBox')).toContainText('belum didukung');
});

test('validasi: tautan video palsu menampilkan error server, bukan crash', async ({ page }) => {
  // URL video valid secara format, tapi resolver (savett) tidak bisa
  // dijangkau dari VM — yang penting UI menampilkan error rapi.
  // Di CI (egress GitHub) hasilnya sama: error banner, halaman tetap hidup.
  await page.locator('#urlInput').fill('https://www.tiktok.com/@tiktok/video/1234567890123456789');
  await page.locator('#dlBtn').click();
  await expect(page.locator('#errorBox')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('h1')).toBeVisible();
});

test('mobile: tanpa overflow horizontal', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'hanya proyek mobile');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('#urlInput')).toBeVisible();
  await expect(page.locator('.phone')).toBeVisible();
});

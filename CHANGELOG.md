# CHANGELOG — TikTok Downloader

## [1.1.0] — 2026-11-19 — proper (PR #1)

Restructure kedua di program P1 (setelah #33 lokakos) + rebuild total.

### Restructure

- Isi `tiktok-downloader--main/` dipindah ke root; subfolder lama dihapus
  dari tree. App kini jalan dari root (`npm run build` → `dist/`).
- `tiktok-downloader--main/api/download.js` (Vercel + axios + cheerio) →
  `worker/_worker.js` (Cloudflare Pages Worker, fetch + regex, tanpa
  dependensi; bentuk respons sama).
- `tiktok-downloader--main/README.md` hanya satu baris terpotong
  (`# tiktok-downloader-`) — dibuang; README root dipakai + ditulis ulang.
- `package.json` lama (axios + cheerio) dihapus — nol dependensi produksi.

### Fitur & perbaikan

- Rebuild UI anti-slop: hero split (alat kiri, pemutar 9:16 + rel aksi
  vertikal ala TikTok kanan), cara pakai strip horizontal, fitur daftar
  berbaris, FAQ, footer satu baris. Referensi pemenang: Copia (Framer).
- Perbaikan parser: label "MP4 No Watermark" dulu salah masuk golongan
  watermark (mengandung kata "watermark") — kini dicek "no watermark" dulu.
- Pilih format dummy dihapus: tombol unduh muncul hanya bila URL-nya ada.
- `alert()` diganti banner error inline; validasi URL TikTok client +
  server; tombol Tempel clipboard; mode contoh video + foto berlabel
  "Contoh"; hero memuat contoh video saat dibuka.
- Endpoint baru: `GET /api/status`, `GET /api/demo?type=video|photo`.

### Testing & CI

- Unit test worker 11/11 (`node:test` + fixture HTML savett).
- E2E Playwright desktop + mobile (landing, demo video/foto, validasi).
- CI 6 job: build, worker-test, static-checks, advisory-sweep (OSV),
  playwright-e2e, smoke. Node 24.
- Gate 7 sumbu anti-slop: 5/4/5/4/4/4/5 — semua ≥ 4. Tes siluet lolos.

### Deploy

- Cloudflare Pages: `https://tiktok-downloader.pages.dev` (nama final
  dicatat setelah create-project; fallback `tiktokdownloader` →
  `unduh-tiktok`).

## [1.0.0] — 2026 — awal

- Scaffold: halaman statis + Vercel Function di subfolder
  `tiktok-downloader--main/`, README + PRD + LICENSE + .gitignore.

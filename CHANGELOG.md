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

- Cloudflare Pages: `https://unduh-tiktok.pages.dev`. Nama `tiktok-downloader`
  HTTP 409 (dipakai akun Cloudflare lain); `tiktokdownloader` jadi
  bersufiks (`tiktokdownloader-2ki.pages.dev`, proyek dihapus lagi);
  `unduh-tiktok` bersih.
- **Perbaikan parser pasca-deploy pertama (commit ke-2 PR #1):** nilai
  `<option>` savett memakai entitas `&#34;` (bukan `&quot;`) sehingga
  `JSON.parse` gagal dan semua URL unduhan kosong — padahal resolver
  merespons 200 dengan statistik asli. Ditemukan lewat HTML savett asli
  (diambil via curl POST dari VM), diperbaiki (decoder `&#34;` + statistik
  dipersempit ke span `.text-secondary`), dibuktikan parse HTML asli:
  6 URL nowm, 3 wm, 1 mp3. Fixture unit test diperbarui ke markup asli.
- **Play-test live tautan asli (commit ke-3 PR #1):** `/api/download`
  untuk `@official.account8830/video/7692726307108556063` → 200, 6 nowm,
  3 wm, 1 mp3, statistik asli; file terverifikasi: video `206 video/mp4`
  (`ftypisom`), audio `206 audio/mpeg`; headless play-test live menampilkan
  pratinjau + ketiga tombol unduh (`docs/screenshots/live-hasil-asli.png`).
  Perbaikan kecil: caption bawah pemutar kini berganti teks untuk hasil
  asli (sebelumnya selalu berbunyi "hasil contoh").

## [1.0.0] — 2026 — awal

- Scaffold: halaman statis + Vercel Function di subfolder
  `tiktok-downloader--main/`, README + PRD + LICENSE + .gitignore.

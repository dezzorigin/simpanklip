# PRD — Simpan Klip (v2.0)

| Field | Nilai |
|---|---|
| Nama Proyek | Simpan Klip |
| Tech Stack | Situs statis (HTML/CSS/JS tanpa framework) + Cloudflare Pages Worker (JavaScript, tanpa dependensi) |
| Status | Proper (v1.1.0) — restructure + rebuild |
| Penanggung Jawab | Nabil Aulia Dika |
| Live Demo | https://simpanklip.pages.dev |
| Versi Dokumen | 2.0 |
| Tanggal | 2026-11-19 |

## 1. Latar Belakang

Download video tanpa watermark. App lama (2026) adalah halaman
statis + Vercel Serverless Function (`api/download.js`, axios + cheerio)
yang nyangkut di subfolder `tiktok-downloader--main` dan tidak bisa jalan
dari root repo. Rebuild ini memindahkan app ke root, mengganti function
Vercel dengan Cloudflare Pages Worker tanpa dependensi, dan membangun ulang
UI mengikuti standar anti-slop P1.

## 2. Tujuan

- Tempel tautan video → unduh video MP4 tanpa watermark, audio MP3, atau
  slide foto — tanpa akun, tanpa aplikasi, tanpa biaya.
- Satu perintah build menghasilkan folder `dist/` yang siap deploy ke
  Cloudflare Pages (situs + worker).
- Setiap fitur di dokumen ini berfungsi di play-test live; tombol mati
  tidak diterima.

## 3. Ruang Lingkup

Masuk: form unduh (validasi URL video di server), resolver via
savett.cc, pratinjau video/foto, unduh paksa via blob (fallback tab baru),
mode contoh (video + foto) berlabel jujur, landing ala SaaS (navbar +
GitHub, hero split, cara pakai, fitur, FAQ, footer), docs lengkap, CI,
deploy Pages.

Tidak masuk: akun/pembayaran, riwayat unduhan server-side, unduh massal
di luar slide foto, dukungan platform video lain.

## 4. Fitur & Persyaratan Fungsional

| ID | Fitur | Kriteria |
|---|---|---|
| F1 | Tempel tautan + Unduh | Input menerima tautan video dari host yang didukung (allowlist di worker); tautan lain ditolak server |
| F2 | Pratinjau video | Video MP4 tanpa watermark tampil di pemutar 9:16 + rel aksi (suka/komentar/bagikan + angka tabular) |
| F3 | Unduh video | Tombol utama mengunduh MP4 tanpa watermark; bila hanya ada versi watermark, tombol itu yang tampil + tombol cadangan |
| F4 | Unduh audio | Tombol MP3 muncul hanya bila resolver mengembalikan URL audio |
| F5 | Slide foto | Slider geser + counter + unduh foto aktif + unduh semua foto berurutan |
| F6 | Tempel dari clipboard | Tombol Tempel membaca clipboard; bila ditolak browser, tampilkan petunjuk tempel manual |
| F7 | Mode contoh | "Coba contoh video/foto" memuat hasil contoh dengan lencana "Contoh"; hero memuat contoh video saat dibuka |
| F8 | Penanganan error | Resolver mati / konten tidak ditemukan / URL salah → banner error inline berbahasa Indonesia, halaman tetap hidup |
| F9 | `GET /api/status` | `{ok:true, service, mode, time}` untuk health check |
| F10 | `GET /api/demo` | `?type=video\|photo` → hasil contoh (`demo:true`) |

## 5. Persyaratan Non-Fungsional

- **Performa:** situs statis + worker edge; tanpa framework JS di client.
- **Keamanan:** hanya host video yang didukung yang diterima (worker bukan proxy
  terbuka); URL dibatasi 2048 karakter; timeout resolver 15 detik; rahasia
  (`.env`) tidak boleh ter-commit; nol dependensi produksi.
- **Aksesibilitas:** label untuk semua kontrol, `role="alert"` untuk error,
  `aria-live` untuk hasil, focus-visible, kontras AA, hormat
  `prefers-reduced-motion`, target sentuh min 44px di mobile.
- **Maintainability:** worker satu file tanpa dependensi + unit test
  `node:test`; frontend vanilla dengan fungsi kecil yang teruji e2e.

## 6. Arsitektur & Tech Stack

Lihat [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) dan
[docs/diagrams.html](docs/diagrams.html).

- `public/` — `index.html`, `style.css` (tulis tangan), `app.js`, `favicon.svg`.
- `worker/_worker.js` — ESM worker: sajikan ASSETS + `/api/status`,
  `/api/demo`, `/api/download` (fetch savett.cc, parse regex).
- `scripts/` — build, serve-worker lokal, check-links, check-static,
  smoke, screenshot, make-video, advisory-sweep (OSV).
- CI (`.github/workflows/ci.yml`): build, worker-test, static-checks,
  advisory-sweep, playwright-e2e, smoke. Node 24.

## 7. Milestone

| Fase | Status |
|---|---|
| Restructure subfolder → root | ✅ (PR #1) |
| Worker pengganti function Vercel | ✅ |
| Rebuild UI anti-slop | ✅ |
| Testing (unit + e2e + smoke) | ✅ |
| Deployment Cloudflare Pages | ✅ |
| Dokumentasi | ✅ |

## 8. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| savett.cc berubah format / mati | Parser gagal → error 404/502 yang jelas; mode contoh tetap jalan; fixture parser diuji unit |
| savett.cc diblokir dari edge tertentu | Timeout 15 detik + pesan "coba lagi"; tidak ada retry buta |
| Tautan privat/dihapus | Error "konten tidak ditemukan" (404), bukan crash |
| Penyalahgunaan worker sebagai proxy | Hanya host video yang didukung yang diterima; URL dibatasi panjangnya |
| Nama Pages diambil orang lain | Fallback berurutan: `tiktok-downloader` → `tiktokdownloader` → `unduh-tiktok` → `unduh-video` (subdomain `unduh-video.pages.dev` sudah dipakai akun Cloudflare lain — proyek di akun ini jadi `unduh-video-2gw.pages.dev`, 2026-11-20) → `simpanklip` (final, rebrand 2026-11-20) |

## 9. Kriteria Keberhasilan

- `npm run build` menghasilkan `dist/` lengkap; CI hijau 6/6 job.
- Play-test lokal + live: contoh video & foto jalan; tautan video asli
  menghasilkan pratinjau + tombol unduh; error tampil inline.
- Gate 7 sumbu anti-slop ≥ 4/5 tiap sumbu; tes siluet lolos.
- Live di Cloudflare Pages (HTTP 200) + homepage repo terpasang.

## 10. Lisensi

MIT (LICENSE)

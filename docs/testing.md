# Testing — Unduh Video

## 1. Unit test worker — `npm test` (11 tes, `node:test`)

`worker/_worker.test.mjs` — tanpa server, tanpa jaringan:

- `isSupportedVideoUrl`: host video yang didukung diterima (`tiktok.com`, `www`, `m`, `vt`,
  `vm`); YouTube / domain mirip / bukan-URL / URL > 2048 ditolak.
- `parseSavettHtml` dengan fixture `worker/fixtures/` (HTML savett
  tiruan dari bentuk markup selector cheerio asli): video (username,
  statistik, durasi, nowm/wm/mp3), foto (3 slide, `type:"photo"`),
  halaman tanpa `video-info` → `NOT_FOUND`.
- `resolveVideo` dengan fetch tiruan: urutan GET csrf → POST, cookie
  sesi diteruskan, `source:"savett"`; URL yang tidak didukung ditolak sebelum
  fetch; resolver mati → `RESOLVER_DOWN`.
- Handler `/api/status` (200 `ok:true`), `/api/demo` video + foto
  (`demo:true`), `/api/download` tanpa url / url yang tidak didukung (400),
  `/api/download` meneruskan hasil resolve (fetch global di-stub).

Jalankan: `npm test` — 11/11 hijau (2026-11-19).

## 2. E2E Playwright — `npx playwright test`

`e2e/app.spec.js`, proyek `desktop` (1440×900) + `mobile` (390×844),
terhadap `npm run serve` (dist/ + worker lokal). Tidak menyentuh
savett.cc — jalur resolver asli diuji unit + live pasca-deploy.

| Tes | Yang dibuktikan |
|---|---|
| landing | Judul, h1, tautan GitHub, input + tombol, section cara pakai/fitur/FAQ |
| demo video | Lencana "Contoh", pratinjau `<video>`, statistik `89.012`, tombol video + audio |
| demo foto | Slider 3 gambar, counter `1 / 3` → `2 / 3` → `1 / 3`, tombol foto + semua foto |
| validasi kosong/tautan tidak didukung | Banner error inline, tanpa crash |
| tautan video palsu | Error server tampil sebagai banner, halaman tetap hidup |
| mobile | Tanpa overflow horizontal; input + pemutar terlihat |

Catatan: `npx playwright install chromium` hanya di CI — JANGAN di VM dev
(menghapus cache browser tooling video-demo; pelajaran #28).

## 3. Smoke `dist/` — `npm run smoke`

Memeriksa file wajib di `dist/` + menjalankan serve-worker sementara dan
memanggil: `/` (200 + judul), `/api/status`, `/api/demo` video + foto,
`/api/download` tanpa url (400), url yang tidak didukung (400), `/favicon.svg`,
`/style.css`, `/tidak-ada` (404). Hanya GET (POST dari VM menggantung di
egress proxy — pelajaran #29/docsumm).

## 4. Pemeriksaan statis — `npm run validate`

- `check-links.mjs`: tautan lokal di Markdown + `public/index.html`
  benar-benar ada; file wajib lengkap.
- `check-static.mjs`: gate P0 anti-slop (tanpa gradient ungu/biru,
  `bg-clip-text`, Inter/Roboto, `rounded-2xl/3xl`, `shadow-lg`, emoji
  mentah), tanpa sisa axios/cheerio/Vercel, tanpa subfolder
  `tiktok-downloader--main`, tanpa secret kasar / `.env`.

## 5. Advisory sweep — `npm run sweep`

OSV batch tanpa auth (`scripts/advisory-sweep.py`, pola #24–#33). Repo ini
nol dependensi produksi → sweep selalu bersih; skrip tetap dijalankan
sebagai gate. JANGAN ganti ke GitHub Advisory DB API + token (401
deterministik, pelajaran #24).

## 6. Gate 7 sumbu anti-slop (sebelum merge)

| Sumbu | Nilai | Alasan |
|---|---|---|
| anti-slop purity | 5 | Nol P0 + nol orde-kedua (diperiksa `check-static`); palet hitam + merah/cyan, bukan klise |
| UX speed & 1-to-3 | 4 | 1 aksi utama per viewport (Unduh); sekunder: Tempel + 2 demo |
| tipografi | 5 | Sora + Figtree saja; angka statistik tabular-nums; body ≤ 75ch |
| spacing & geometri | 4 | Grid 8pt; kartu 12px; padding kartu ≥ 16px; pil hanya CTA |
| motion | 4 | Transisi ≤ 180ms ease-out; `prefers-reduced-motion` dihormati; active scale 0.97 |
| a11y | 4 | Label semua kontrol, `role="alert"`, `aria-live`, focus-visible, kontras AA, target sentuh ≥ 44px |
| mobile | 5 | Stack vertikal rapi 390px, tanpa overflow horizontal (diuji e2e) |

## 7. Tes siluet

Screenshot landing diperkecil ke thumbnail hitam-putih: bingkai ponsel
9:16 + rel aksi vertikal + tombol merah langsung terbaca sebagai alat
unduh video — bukan halaman SaaS generik. Lolos.

## 8. Play-test live (pasca-deploy)

- `/` HTTP 200 + hero + contoh video tampil.
- `/api/demo` video + foto.
- `/api/download` dengan tautan video asli
  (`@tiktokofficiacount/video/7639640054398209287`): pratinjau +
  tombol unduh muncul; unduh video benar-benar menyimpan file.
- Tautan yang tidak didukung → 400 JSON; video privat → 404 JSON.

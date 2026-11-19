# Arsitektur — TikTok Downloader

## 1. Gambaran

Situs statis + satu Cloudflare Pages Worker tanpa dependensi. Tidak ada
framework frontend, tidak ada database, tidak ada secret. Satu-satunya
pihak ketiga adalah **savett.cc** (resolver tautan TikTok → file media)
yang dipanggil server-side oleh worker.

```
Pengguna ──► Cloudflare Pages ──► _worker.js ──┬──► ASSETS (dist/* statis)
                                              ├──► /api/demo (data contoh)
                                              └──► /api/download ──► savett.cc
```

## 2. Struktur repo

```
public/
  index.html      # landing + alat (hero split, cara pakai, fitur, FAQ)
  style.css       # CSS tulis tangan; variabel palet di :root
  app.js          # form, render hasil, slider foto, forceDownload
  favicon.svg
worker/
  _worker.js      # Pages Worker: ASSETS + /api/status|demo|download
  _worker.test.mjs
  fixtures/       # HTML savett tiruan (video + foto) untuk unit test
scripts/          # build, serve-worker, check-*, smoke, screenshot,
                  # make-video, advisory-sweep (OSV batch)
e2e/app.spec.js   # Playwright desktop + mobile
docs/             # DESIGN, ARCHITECTURE, diagrams, testing, deploy, demo
dist/             # hasil build (diabaikan git) — yang di-deploy
```

## 3. Endpoint worker

| Endpoint | Metode | Respons |
|---|---|---|
| `/api/status` | GET | `{ok:true, service:"tiktok-downloader", mode:"pages-worker", time}` |
| `/api/demo?type=video\|photo` | GET | Hasil contoh, selalu `demo:true` (media: MDN CC0 + Picsum) |
| `/api/download?url=…` | GET | Hasil resolve (bentuk di bawah) atau `{error, code}` |
| `/` dan aset lain | GET | Diserahkan ke binding `ASSETS` (file `dist/`) |

### Bentuk respons `/api/download` (sama dengan API Vercel lama)

```jsonc
{
  "username": "contoh_kreator",
  "views": "1.234.567", "likes": "89.012",
  "comments": "1.234", "shares": "5.678",
  "duration": "00:24",
  "type": "video",              // atau "photo"
  "downloads": { "nowm": ["https://…/video.mp4"], "wm": [] },
  "mp3": ["https://…/audio.mp3"],
  "slides": [],                 // foto: [{index, url}]
  "source": "savett"
}
```

### Kode error `/api/download`

| Kode | HTTP | Arti |
|---|---|---|
| (tanpa `url`) | 400 | Parameter `url` wajib diisi |
| `BAD_URL` | 400 | Bukan tautan TikTok |
| `NOT_FOUND` | 404 | Konten tidak ditemukan / sudah dihapus / privat |
| `RESOLVER_DOWN` | 502 | savett.cc tidak dapat dihubungi |
| `RESOLVER_CHANGED` | 502 | Format halaman resolver berubah (csrf tidak ketemu) |

## 4. Alur `/api/download`

1. Validasi host: `tiktok.com`, `www.`, `m.`, `vt.`, `vm.` — selain itu
   ditolak (worker bukan proxy terbuka). Panjang URL ≤ 2048.
2. `GET https://savett.cc/en1/download` → ambil `csrf_token` + cookie sesi.
3. `POST` ke URL yang sama dengan `csrf_token` + `url` (form-urlencoded).
4. Parse HTML hasil dengan regex (tanpa cheerio):
   - `#video-info h3` → username; 5 span `.text-secondary` di `.my-1` →
     statistik (views, likes, saves, comments, shares); `Duration:` →
     durasi. Statistik dipersempit ke class itu supaya span lain
     ("Format", `&sdot;`) tidak ikut terambil.
   - `#formatselect option` → JSON `{URL:[…]}` per label; nilai memakai
     entitas `&#34;` (bukan `&quot;`) — decoder menanganinya. Label asli:
     `MP4`/`MP4HD` → nowm, `MP4 Watermark` → wm, `MP3` → mp3;
     `Profile Picture`/`Thumbnail/Cover` diabaikan. Klasifikasi
     "no watermark" dicek dulu sebelum "watermark".
   - `.carousel-item[data-data]` → slide foto (JSON `{URL:[…]}`).
5. Timeout 15 detik (`AbortSignal.timeout`); semua kegagalan fetch
   dipetakan ke `RESOLVER_DOWN`.

## 5. Frontend

- `app.js` — tanpa framework. State: `current` (hasil terakhir), `slides`,
  `slideIndex`. Fungsi: `isTikTokUrl`, `renderResult`, `updateSlideUI`,
  `forceDownload`, `loadDemo`.
- Unduh paksa: `fetch(url, {referrerPolicy:'no-referrer'})` → blob →
  `<a download>`. `no-referrer` mencegah 403 CDN TikTok. Fallback:
  `window.open(url)` bila fetch diblokir.
- Pratinjau awal: `loadDemo('video')` saat halaman dibuka — hero langsung
  menunjukkan produk (bukan halaman kosong).
- Font: Sora (display) + Figtree (body) via Google Fonts, fallback sistem.

## 6. Keputusan teknis (dan yang ditolak)

| Keputusan | Alasan |
|---|---|
| Pages Worker, bukan Vercel Function | Target deploy program P1 adalah Cloudflare Pages; worker satu file tanpa dependensi |
| Parse regex, bukan cheerio | Cheerio/axios tidak jalan apa adanya di runtime Workers; parser regex teruji unit dengan fixture |
| Nol dependensi produksi | Permukaan serangan + sweep OSV minimal; frontend vanilla |
| `dist/` hasil build, bukan deploy `public/` langsung | `_worker.js` harus ada di root folder deploy (pola docsumm + `cf_pages.py`) |
| Demo bawaan worker (`/api/demo`) | E2E deterministik + hero selalu menunjukkan produk, tanpa bergantung ke savett |
| Tanpa `.env` / secret | Tidak ada kredensial yang dibutuhkan — resolver publik tanpa kunci |
| Tanpa framework CSS | Standar anti-slop melarang tema mentah; CSS tulis tangan memberi kontrol penuh atas palet + radius |

## 7. Keamanan

- Allowlist host TikTok (server + client) — worker tidak bisa dipakai
  sebagai proxy terbuka.
- Batas panjang URL + timeout resolver.
- CORS `*` hanya untuk GET (sama seperti API lama).
- Tanpa penyimpanan: tautan dipakai sekali, tidak dicatat.
- Advisory sweep OSV di CI atas paket produksi (nol paket → selalu bersih;
  skrip tetap dijalankan sebagai gate).

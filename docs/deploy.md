# Deploy — Simpan Klip

## 1. Target

Cloudflare Pages, proyek `simpanklip` → `https://simpanklip.pages.dev`.

Urutan nama (namespace global, baru ketahuan saat create): `tiktok-downloader`
→ `tiktokdownloader` → `unduh-tiktok` → `unduh-video` (subdomain sudah dipakai akun lain — proyek ini jadi `unduh-video-2gw.pages.dev`, 2026-11-20) → `simpanklip` (final, rebrand 2026-11-20, komplain merek). Nama final dicatat di CHANGELOG.

## 2. Cara deploy

Build lokal, lalu deploy folder `dist/` dengan helper API Pages:

```bash
npm install
npm run build   # dist/ berisi public/* + _worker.js
python3 ~/workspace/github-actions/cf_pages.py create-project simpanklip
python3 ~/workspace/github-actions/cf_pages.py deploy simpanklip dist
```

`cf_pages.py` mengemas `dist/_worker.js` sebagai `_worker.bundle`
(worker Pages) dan sisanya sebagai aset statis — pola yang sama dengan
repo #22 docsumm. Kalau `deploy` 404 sesaat setelah `create-project`,
tunggu ~20 detik lalu ulangi (pelajaran #33) — bukan error nama.

Tidak ada variabel env / secret yang perlu di-set di dashboard Pages.

## 3. Verifikasi live (wajib sebelum merge)

```bash
BASE=https://simpanklip.pages.dev
curl -s -o /dev/null -w "%{http_code}\n" $BASE/                       # 200
curl -s $BASE/api/status                                             # {"ok":true,...}
curl -s "$BASE/api/demo?type=video" | head -c 200                    # demo:true
curl -s "$BASE/api/demo?type=photo" | head -c 200                    # type:photo
curl -s "$BASE/api/download?url=https://www.tiktok.com/@tiktokofficiacount/video/7639640054398209287"
```

Terakhir: uji tautan video asli end-to-end (pratinjau + tombol unduh
muncul). Kalau savett.cc menolak dari edge, respons harus berupa JSON
error 502 yang jelas — bukan halaman crash.

## 4. Setelah live

Pasang link live di About repo (PATCH homepage GitHub) dan verifikasi
homepage terpasang. Deploy lama `915a22db.tiktok-downloader-f3g.pages.dev`
(app lama) tidak dipakai lagi.

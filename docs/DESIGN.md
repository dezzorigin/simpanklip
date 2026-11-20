# DESIGN.md — Kontrak Arah Desain Simpan Klip

> Ditulis SEBELUM coding (standar anti-slop P1 §4). Referensi dipilih dulu,
> palet dikunci dulu, baru bangun. Repo #34 — restructure kedua di program P1
> (setelah #33 lokakos).

## 1. Produk & pengguna

Simpan Klip — alat tempel-tautan untuk mengunduh video tanpa
watermark, audio MP3, dan slide foto. Pengguna: siapa pun yang menyimpan
klip video untuk ditonton offline / dipakai ulang — mereka butuh **tempel,
klik, simpan**, bukan membaca brosur. Formulir unduh adalah produknya;
landing adalah pembungkusnya.

## 2. Referensi (3 kandidat, 1 pemenang)

| # | Referensi | URL | Kenapa cocok |
|---|---|---|---|
| 1 — **PEMENANG** | **Copia** (template Framer, landing Mac/desktop app) | https://www.framer.com/marketplace/templates/copia/ | Dibuka dengan **mock aplikasi native** sebagai hero, lalu bento fitur. Struktur inilah yang di-clone: hero split — alat di kiri, jendela produk (bingkai ponsel berisi hasil unduhan) di kanan; fitur sebagai daftar, bukan kartu simetris. |
| 2 | **Voxera** (template Framer, dark AI/SaaS) | https://yoframer.com/templates/voxera/ | Dark minimal, tipografi besar, satu aksi per viewport. Pembenar arah gelap + headline besar rata kiri (bukan hero tengah). |
| 3 | **Downloot** (downloot.net — produk downloader nyata) | https://downloot.net | Bukti fungsional: "paste a link, pick a format, get the file. no noise." — alat satu layar tanpa akun, tanpa iklan, tanpa tier. Pembenar keputusan: tanpa harga, tanpa statistik vanity, tanpa langkah berbelit. |

**Yang di-clone plek-ketiplek dari Copia:** hero split (alat kiri, jendela
produk kanan), jendela produk sebagai mock yang benar-benar berfungsi
(pratinjau hasil contoh, bukan gambar mati), fitur sebagai daftar berbaris,
footer satu baris. **Yang diubah:** isinya alat unduh video (bukan app Mac),
palet hitam + merah/cyan (bukan netral Copia), bingkai produk
berbentuk ponsel 9:16 dengan rel aksi vertikal, bahasa Indonesia,
data contoh dilabeli "contoh" dengan jujur.

## 3. Palet (6 warna bernama — tiap warna punya tugas)

| Nama | Hex | Peran |
|---|---|---|
| Panggung Hitam | `#0E0E10` | Background utama — panggung gelap, bukan slate/biru |
| Layar Arang | `#17171A` | Permukaan kartu & kolom input — satu tingkat di atas panggung |
| Merah | `#FE2C55` | CTA utama + sorot merek — warna aksen utama, dipakai hemat (tombol + aksen kecil saja) |
| Cyan | `#25F4EE` | Aksen sekunder — pasangan Merah; dipakai untuk rel aksi aktif & garis sorot pratinjau |
| Kertas Putih | `#F4F4F2` | Teks utama — putih hangat, bukan putih klinik |
| Abu Sinyal | `#9A9AA3` | Teks sekunder, label, garis halus — kontras terhadap Panggung Hitam 7.0:1 (AA) |

Catatan anti-klise: ini **bukan** near-black + lime asam (orde-kedua yang
dilarang) — pasangan merah + cyan adalah warna aksen situs ini, dan
merah dipakai hanya sebagai arti "aksi unduh", sama seperti cyan hanya
sebagai arti "pratinjau aktif". Tidak ada gradient apa pun di halaman.

## 4. Tipografi (maks 2 keluarga)

- **Display: Sora** — headline, angka statistik besar, nama pengguna hasil.
  Geometris tegas, rasa "alat video" bukan "dashboard SaaS".
- **Body: Figtree** — teks UI, label, tombol, langkah cara pakai.
- Angka statistik pakai `font-variant-numeric: tabular-nums`.
- Body ≤ 75ch. Satu ukuran headline hero, tidak ada kata yang di-italic /
  diwarnai / digradient di tengah headline.

## 5. Layout (satu kalimat) + detail khas

**Satu kalimat:** "Hero split — alat tempel-tautan di kiri, bingkai ponsel
9:16 berisi pratinjau hasil di kanan; di bawahnya strip cara pakai
horizontal lalu daftar fitur berbaris."

**Detail khas (signature):** kartu hasil berbentuk **pemutar video 9:16** —
bingkai vertikal 9:16 dengan **rel aksi vertikal di sisi kanan** (hati,
komentar, bagikan + angka tabular), persis rel aksi aplikasi video; tombol
unduh menempel di bawah bingkai seperti tombol aksi aplikasi. Sekali lihat
thumbnail, ketahuan ini alat unduh video, bukan SaaS generik.

**Geometri:** radius kartu 12px, kolom input 10px, tombol pil 999px hanya
untuk CTA utama, bayangan satu tingkat tipis (`0 1px 0` + `0 12px 32px`
untuk bingkai ponsel), grid 8pt, padding kartu ≥ 16px.

## 6. Beda dari repo sebelumnya (#33 lokakos) — 5/5 sumbu

| Sumbu | #33 lokakos | #34 simpanklip |
|---|---|---|
| Palet | Kertas Peta / Tinta Darussalam / Daun Kopelma / Kunyit / Bata / Abu Jalan (kertas terang) | Panggung Hitam / Layar Arang / Merah / Cyan / Kertas Putih / Abu Sinyal (panggung gelap) |
| Tipografi | Fraunces (serif editorial) + Public Sans | Sora (geometris) + Figtree |
| Layout | Split hero + peta hidup; app `/peta` panel kiri + peta | Hero split alat + bingkai ponsel 9:16; hasil sebagai pemutar vertikal |
| Radius/spacing | Kartu 10px + pil karcis + tepi robek | Kartu 12px + pil CTA + bingkai ponsel |
| Detail khas | Karcis harga kunyit + tepi robek papan pengumuman | Pemutar video 9:16 + rel aksi vertikal |

## 7. Larangan P0 — checklist sebelum merge

- [ ] Tanpa gradient ungu/biru, tanpa headline gradient (`bg-clip-text`)
- [ ] Tanpa Inter / Roboto / system font untuk semuanya (Sora + Figtree)
- [ ] Tanpa hero tengah + 3 kartu identik (hero split kiri-kanan; fitur daftar berbaris)
- [ ] Tanpa emoji mentah sebagai ikon fungsi (SVG inline satu bobot, stroke 1.5–2px)
- [ ] Tanpa statistik vanity palsu (angka yang tampil = statistik asli konten dari API; tanpa klaim pengguna/uptime)
- [ ] Tanpa satu kata headline di-italic / diwarnai / digradient
- [ ] Tanpa tema Tailwind/Bootstrap mentah (CSS tulis tangan, tanpa framework)
- [ ] Tanpa `rounded-2xl shadow-lg` di semua permukaan; tanpa footer 4 kolom
- [ ] Tanpa copy generik ("Elevate your workflow" dkk.) — copy Bahasa Indonesia, spesifik alat
- [ ] Tanpa tombol/link mati: pilih format yang dulu dummy dihapus — tombol unduh muncul hanya bila URL-nya ada; semua tautan di halaman diverifikasi hidup

## 8. Cacat produk lama yang diperbaiki (bukan sekadar gaya)

1. **Pilih format dummy** — `<select>` MP4/MP3 di app lama tidak dipakai
   logika unduh sama sekali (kedua tombol selalu muncul). Dihapus;
   tombol unduh muncul hanya untuk format yang benar-benar dikembalikan API.
2. **`alert()` sebagai satu-satunya umpan balik error** — diganti banner
   error inline + status loading di tombol.
3. **Tanpa validasi URL** — tautan yang tidak didukung kini ditolak server
   sebelum request ke resolver.
4. **Tanpa mode demo** — tombol "Coba contoh" memuat hasil contoh berlabel
   jujur, supaya alat bisa didemo tanpa tautan video dan e2e deterministik.
5. **FontAwesome CDN + font sistem** — diganti SVG inline + Sora/Figtree.

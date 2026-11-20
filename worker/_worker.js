// Unduh Video — Cloudflare Pages _worker.js (single-file, tanpa dependensi).
//
// Menggantikan api/download.js era Vercel (axios + cheerio). Worker ini:
//   - menyajikan situs statis lewat binding ASSETS (dist/ hasil build),
//   - GET  /api/status            -> kesehatan worker,
//   - GET  /api/download?url=...  -> resolve tautan video lewat savett.cc
//        (GET halaman csrf -> POST tautan -> parse HTML hasil),
//   - GET  /api/demo?type=video|photo -> hasil contoh berlabel demo:true.
//
// Bentuk respons /api/download sama dengan API lama (username, views, likes,
// comments, shares, duration, type, downloads.{nowm,wm}, mp3, slides) supaya
// frontend lama/baru kompatibel. Parsing HTML ditulis dengan regex murni —
// cheerio/axios tidak bisa jalan apa adanya di runtime Workers dan keduanya
// dihapus dari dependensi (nol dependensi produksi).
//
// Batas penyalahgunaan: hanya host platform video yang didukung yang diterima (mencegah worker
// dipakai sebagai proxy terbuka), panjang URL dibatasi, timeout 15 detik.

const SAVETT_ORIGIN = 'https://savett.cc';
const SAVETT_PAGE = `${SAVETT_ORIGIN}/en1/download`;

const FETCH_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Origin: SAVETT_ORIGIN,
  Referer: SAVETT_PAGE,
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
};

const SUPPORTED_VIDEO_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vt.tiktok.com',
  'vm.tiktok.com',
]);

export function isSupportedVideoUrl(raw) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return false;
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  return SUPPORTED_VIDEO_HOSTS.has(u.hostname.toLowerCase());
}

function decodeEntities(s) {
  return s
    .replace(/&#34;|&#x22;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '').trim();
}

/** Parse halaman hasil savett.cc menjadi bentuk respons API. */
export function parseSavettHtml(html) {
  if (typeof html !== 'string' || !html.includes('video-info')) {
    const err = new Error('Konten tidak ditemukan atau sudah dihapus.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Blok #video-info kecil — potong jendela di sekitarnya supaya regex
  // <h3>/<span> tidak menangkap elemen halaman lain.
  const viStart = html.indexOf('video-info');
  const region = html.slice(viStart, viStart + 12000);

  const username = stripTags(region.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '');
  if (!username) {
    const err = new Error('Konten tidak ditemukan atau sudah dihapus.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Statistik: 5 span .text-secondary di blok .my-1 — urutan tetap:
  // views, likes, saves, comments, shares (mapping warisan kode lama).
  // Dipersempit ke class itu supaya span lain ("Format", "&sdot;") tidak
  // ikut terambil; fallback ke semua span bila markup berubah lagi.
  let stats = [...region.matchAll(/<span class="text-secondary[^"]*">([^<]*)<\/span>/g)].map((m) => m[1].trim());
  if (stats.length < 5) {
    stats = [...region.matchAll(/<span[^>]*>([^<]*)<\/span>/g)].map((m) => m[1].trim());
  }
  const duration =
    region.match(/Duration:\s*([^<]+)/i)?.[1].trim() || null;

  const data = {
    username,
    views: stats[0] || '0',
    likes: stats[1] || '0',
    comments: stats[3] || '0',
    shares: stats[4] || '0',
    duration,
    type: 'video',
    downloads: { nowm: [], wm: [] },
    mp3: [],
    slides: [],
  };

  // Slide foto: .carousel-item[data-data] berisi JSON { URL: [...] }.
  const slideAttrs = [...html.matchAll(/data-data="([^"]*)"/g)];
  if (slideAttrs.length > 0) {
    data.type = 'photo';
    for (const m of slideAttrs) {
      try {
        const json = JSON.parse(decodeEntities(m[1]));
        if (Array.isArray(json.URL)) {
          for (const u of json.URL) {
            data.slides.push({ index: data.slides.length + 1, url: u });
          }
        }
      } catch {
        // Satu slide rusak tidak menggagalkan sisanya.
      }
    }
    return data;
  }

  // Video biasa: <option value="{json}">label</option> di #formatselect.
  const options = [...html.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)];
  for (const m of options) {
    const label = (m[2] || '').toLowerCase();
    let json;
    try {
      json = JSON.parse(decodeEntities(m[1]));
    } catch {
      continue;
    }
    if (!json || !json.URL) continue;
    const urls = Array.isArray(json.URL) ? json.URL : [json.URL];
    // Label asli savett (2026-11-19): "MP4", "MP4HD", "MP4 Watermark",
    // "MP3", "Profile Picture", "Thumbnail/Cover". Hanya tiga pertama yang
    // relevan dengan produk (video/mp3); sisanya diabaikan.
    // PERBAIKAN dari logika lama: label "MP4 No Watermark" mengandung kata
    // "watermark", jadi cek lama (mp4 && !watermark) salah menggolongkannya
    // ke wm. Urutan cek: "no watermark" dulu, baru "watermark".
    if (label.includes('mp4')) {
      if (label.includes('no watermark') || label.includes('tanpa watermark') || label.includes('nowm')) {
        data.downloads.nowm.push(...urls);
      } else if (label.includes('watermark')) {
        data.downloads.wm.push(...urls);
      } else {
        data.downloads.nowm.push(...urls);
      }
    }
    if (label.includes('mp3')) data.mp3.push(...urls);
  }

  return data;
}

/** Resolve satu tautan video lewat savett.cc. `fetcher` bisa di-inject (tes). */
export async function resolveVideo(url, fetcher = fetch) {
  if (!isSupportedVideoUrl(url)) {
    const err = new Error('Tautan video ini belum didukung.');
    err.code = 'BAD_URL';
    throw err;
  }
  const signal = AbortSignal.timeout(15000);
  return resolveVideoWithSession(url, fetcher, signal);
}

async function resolveVideoWithSession(url, fetcher, signal) {
  const getRes = await fetcher(SAVETT_PAGE, {
    headers: { 'User-Agent': FETCH_HEADERS['User-Agent'], Accept: FETCH_HEADERS.Accept },
    signal,
  }).catch((e) => {
    const err = new Error('Layanan resolver sedang tidak dapat dihubungi. Coba lagi sebentar lagi.');
    err.code = 'RESOLVER_DOWN';
    err.cause = e;
    throw err;
  });
  if (!getRes.ok) {
    const err = new Error('Layanan resolver sedang tidak dapat dihubungi. Coba lagi sebentar lagi.');
    err.code = 'RESOLVER_DOWN';
    throw err;
  }
  const page = await getRes.text();
  const csrf = page.match(/name="csrf_token" value="([^"]+)"/)?.[1];
  if (!csrf) {
    const err = new Error('Layanan resolver berubah format. Coba lagi nanti.');
    err.code = 'RESOLVER_CHANGED';
    throw err;
  }
  const setCookie = typeof getRes.headers?.get === 'function' ? getRes.headers.get('set-cookie') : null;

  const body = `csrf_token=${encodeURIComponent(csrf)}&url=${encodeURIComponent(url)}`;
  let html;
  try {
    const postRes = await fetcher(SAVETT_PAGE, {
      method: 'POST',
      headers: { ...FETCH_HEADERS, ...(setCookie ? { Cookie: setCookie } : {}) },
      body,
      signal,
    });
    if (!postRes.ok) throw new Error(`resolver HTTP ${postRes.status}`);
    html = await postRes.text();
  } catch (e) {
    if (e && e.code === 'RESOLVER_DOWN') throw e;
    const err = new Error('Layanan resolver sedang tidak dapat dihubungi. Coba lagi sebentar lagi.');
    err.code = 'RESOLVER_DOWN';
    err.cause = e;
    throw err;
  }

  const data = parseSavettHtml(html);
  data.source = 'savett';
  return data;
}

// ---------------------------------------------------------------------------
// Data contoh — dipakai /api/demo + pratinjau hero. Media contoh berlisensi
// bebas (MDN CC0 + Picsum) dan respons selalu membawa demo:true.
// ---------------------------------------------------------------------------
export const DEMO_VIDEO = {
  demo: true,
  username: 'contoh_kreator',
  views: '1.234.567',
  likes: '89.012',
  comments: '1.234',
  shares: '5.678',
  duration: '00:05',
  type: 'video',
  poster: 'https://picsum.photos/seed/unduh-contoh-video/540/960',
  downloads: {
    nowm: ['https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'],
    wm: [],
  },
  mp3: ['https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3'],
  slides: [],
  source: 'demo',
};

export const DEMO_PHOTO = {
  demo: true,
  username: 'contoh_kreator',
  views: '456.789',
  likes: '12.345',
  comments: '678',
  shares: '910',
  duration: null,
  type: 'photo',
  downloads: { nowm: [], wm: [] },
  mp3: [],
  slides: [
    { index: 1, url: 'https://picsum.photos/seed/unduh-contoh-1/540/960' },
    { index: 2, url: 'https://picsum.photos/seed/unduh-contoh-2/540/960' },
    { index: 3, url: 'https://picsum.photos/seed/unduh-contoh-3/540/960' },
  ],
  source: 'demo',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const handler = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === '/api/status') {
      return json({ ok: true, service: 'unduh-video', mode: 'pages-worker', time: new Date().toISOString() });
    }

    if (url.pathname === '/api/demo') {
      const type = url.searchParams.get('type') === 'photo' ? 'photo' : 'video';
      return json(type === 'photo' ? DEMO_PHOTO : DEMO_VIDEO);
    }

    if (url.pathname === '/api/download') {
      if (request.method !== 'GET') {
        return json({ error: 'Method tidak didukung.' }, 405);
      }
      const target = url.searchParams.get('url') || '';
      if (!target) return json({ error: 'Parameter url wajib diisi.' }, 400);
      if (!isSupportedVideoUrl(target)) {
        return json({ error: 'Tautan video ini belum didukung.' }, 400);
      }
      try {
        const data = await resolveVideo(target);
        return json(data);
      } catch (e) {
        const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'BAD_URL' ? 400 : 502;
        return json({ error: e.message || 'Gagal mengunduh.', code: e.code || 'FAILED' }, status);
      }
    }

    // Statis: serahkan ke ASSETS (Pages). Di luar Pages (tes lokal),
    // serve-worker.mjs menyediakan binding ASSETS dari dist/.
    if (env && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not found', { status: 404 });
  },
};

export default handler;

// Unit test worker: node --test worker/_worker.test.mjs
// Mencakup: validasi URL TikTok, parser HTML savett (fixture), alur resolve
// dengan fetch tiruan, endpoint /api/* lewat handler.fetch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler, {
  DEMO_PHOTO,
  DEMO_VIDEO,
  isTikTokUrl,
  parseSavettHtml,
  resolveTikTok,
} from './_worker.js';

const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const videoHtml = readFileSync(join(FIX, 'savett-video.html'), 'utf8');
const photoHtml = readFileSync(join(FIX, 'savett-photo.html'), 'utf8');

test('isTikTokUrl menerima host TikTok, menolak yang lain', () => {
  assert.equal(isTikTokUrl('https://www.tiktok.com/@a/video/123'), true);
  assert.equal(isTikTokUrl('https://vt.tiktok.com/ZS123/'), true);
  assert.equal(isTikTokUrl('https://vm.tiktok.com/ZS123/'), true);
  assert.equal(isTikTokUrl('https://www.youtube.com/watch?v=123'), false);
  assert.equal(isTikTokUrl('https://tiktok.com.evil.example/x'), false);
  assert.equal(isTikTokUrl('bukan-url'), false);
  assert.equal(isTikTokUrl(''), false);
  assert.equal(isTikTokUrl('x'.repeat(3000)), false);
});

test('parseSavettHtml: video — username, statistik, durasi, tiga format', () => {
  const d = parseSavettHtml(videoHtml);
  assert.equal(d.type, 'video');
  assert.equal(d.username, 'contoh_kreator');
  assert.equal(d.views, '1.234.567');
  assert.equal(d.likes, '89.012');
  assert.equal(d.comments, '1.234');
  assert.equal(d.shares, '5.678');
  assert.equal(d.duration, '00:24');
  assert.deepEqual(d.downloads.nowm, ['https://cdn.contoh/video-nowm.mp4']);
  assert.deepEqual(d.downloads.wm, ['https://cdn.contoh/video-wm.mp4']);
  assert.deepEqual(d.mp3, ['https://cdn.contoh/audio.mp3']);
  assert.deepEqual(d.slides, []);
});

test('parseSavettHtml: foto — tiga slide, type photo', () => {
  const d = parseSavettHtml(photoHtml);
  assert.equal(d.type, 'photo');
  assert.equal(d.username, 'contoh_foto');
  assert.equal(d.slides.length, 3);
  assert.equal(d.slides[2].url, 'https://cdn.contoh/slide3.jpg');
  assert.deepEqual(d.downloads.nowm, []);
});

test('parseSavettHtml: halaman tanpa video-info -> NOT_FOUND', () => {
  assert.throws(() => parseSavettHtml('<html><body>kosong</body></html>'), (e) => e.code === 'NOT_FOUND');
});

test('resolveTikTok: alur GET csrf -> POST -> parse (fetch tiruan)', async () => {
  const calls = [];
  const fakeFetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET' });
    if (!opts.method) {
      return {
        ok: true,
        headers: { get: (n) => (n === 'set-cookie' ? 'session=abc; Path=/' : null) },
        text: async () => videoHtml,
      };
    }
    assert.equal(opts.method, 'POST');
    assert.match(opts.body, /csrf_token=csrf-contoh-123/);
    assert.match(opts.body, /url=https%3A%2F%2Fwww.tiktok.com/);
    assert.match(opts.headers.Cookie, /session=abc/);
    return { ok: true, text: async () => videoHtml };
  };
  const d = await resolveTikTok('https://www.tiktok.com/@a/video/123', fakeFetch);
  assert.equal(d.username, 'contoh_kreator');
  assert.equal(d.source, 'savett');
  assert.equal(calls.length, 2);
});

test('resolveTikTok: URL non-TikTok ditolak sebelum fetch', async () => {
  let called = false;
  await assert.rejects(
    resolveTikTok('https://example.com/x', async () => { called = true; }),
    (e) => e.code === 'BAD_URL',
  );
  assert.equal(called, false);
});

test('resolveTikTok: resolver mati -> RESOLVER_DOWN', async () => {
  await assert.rejects(
    resolveTikTok('https://www.tiktok.com/@a/video/123', async () => { throw new Error('boom'); }),
    (e) => e.code === 'RESOLVER_DOWN',
  );
});

test('GET /api/status -> ok', async () => {
  const res = await handler.fetch(new Request('https://x/api/status'), {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, 'tiktok-downloader');
});

test('GET /api/demo video + photo membawa demo:true', async () => {
  const v = await (await handler.fetch(new Request('https://x/api/demo?type=video'), {})).json();
  assert.equal(v.demo, true);
  assert.equal(v.type, 'video');
  assert.equal(v.downloads.nowm.length, 1);
  const p = await (await handler.fetch(new Request('https://x/api/demo?type=photo'), {})).json();
  assert.equal(p.demo, true);
  assert.equal(p.type, 'photo');
  assert.equal(p.slides.length, 3);
  assert.deepEqual(DEMO_VIDEO, v);
  assert.deepEqual(DEMO_PHOTO, p);
});

test('GET /api/download tanpa url -> 400; url non-TikTok -> 400', async () => {
  const a = await handler.fetch(new Request('https://x/api/download'), {});
  assert.equal(a.status, 400);
  const b = await handler.fetch(new Request('https://x/api/download?url=https://example.com/x'), {});
  assert.equal(b.status, 400);
  assert.match((await b.json()).error, /TikTok/);
});

test('GET /api/download meneruskan hasil resolve (fetch asli di-stub via global)', async () => {
  // Handler memakai fetch global; stub sementara dengan fixture.
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    if (!opts.method) {
      return { ok: true, headers: { get: () => null }, text: async () => photoHtml };
    }
    return { ok: true, text: async () => photoHtml };
  };
  try {
    const res = await handler.fetch(
      new Request('https://x/api/download?url=https://www.tiktok.com/@a/video/123'),
      {},
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.type, 'photo');
    assert.equal(body.slides.length, 3);
  } finally {
    globalThis.fetch = realFetch;
  }
});

#!/usr/bin/env node
// smoke.mjs — verifikasi folder dist/ (persis yang di-deploy ke Pages):
// file wajib ada + server lokal merespons / (200, ada judul), /api/status
// (200 ok:true), /api/demo video + photo (200 demo:true). Hanya GET —
// POST dari VM ini menggantung di egress proxy (pelajaran #29/docsumm).
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const failures = [];

for (const f of ['index.html', 'app.js', 'style.css', 'favicon.svg', '_worker.js']) {
  if (!existsSync(join(DIST, f))) failures.push(`dist/${f} hilang — jalankan npm run build dulu`);
}
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const PORT = 8391;
const srv = spawn(process.execPath, ['scripts/serve-worker.mjs'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  return { status: res.status, text: await res.text() };
}

let code = 0;
try {
  let ok = false;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await get('/api/status');
      if (r.status === 200) { ok = true; break; }
    } catch { /* belum naik */ }
    await wait(500);
  }
  if (!ok) throw new Error('server tidak naik di :' + PORT);

  const checks = [
    ['/', 200, 'Unduh Video'],
    ['/api/status', 200, '"ok":true'],
    ['/api/demo?type=video', 200, '"demo":true'],
    ['/api/demo?type=photo', 200, '"type":"photo"'],
    ['/api/download', 400, 'url wajib diisi'],
    ['/api/download?url=https://example.com/x', 400, 'belum didukung'],
    ['/favicon.svg', 200, '<svg'],
    ['/style.css', 200, '--merah'],
    ['/tidak-ada', 404, 'Not found'],
  ];
  for (const [path, wantStatus, wantText] of checks) {
    const r = await get(path);
    if (r.status !== wantStatus) failures.push(`${path}: status ${r.status}, mau ${wantStatus}`);
    else if (!r.text.includes(wantText)) failures.push(`${path}: isi tidak mengandung ${JSON.stringify(wantText)}`);
    else console.log(`smoke OK ${path} -> ${r.status}`);
  }
} catch (e) {
  failures.push(e.message);
} finally {
  srv.kill();
}

if (failures.length > 0) {
  console.error('smoke GAGAL:');
  for (const m of failures) console.error(` - ${m}`);
  code = 1;
} else {
  console.log('smoke OK — dist/ siap deploy');
}
process.exit(code);

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8420);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

let latest = null;
let seq = 0;
const waiters = new Set();
const stats = { frames: 0, bytes: 0, started: Date.now(), lastFrameAt: 0 };

const viewer = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Market Rush — live</title>
<style>html,body{margin:0;height:100%;background:#120c04;overflow:hidden}
img{width:100%;height:100%;object-fit:contain;display:block}
#hud{position:fixed;left:8px;bottom:8px;color:#ffc21a;font:12px/1.4 system-ui;opacity:.75;pointer-events:none;text-shadow:0 1px 2px #000}</style></head>
<body><img id="v" alt=""><div id="hud">connecting</div>
<script>
const v = document.getElementById('v');
const hud = document.getElementById('hud');
let seq = 0, url = null, shown = 0, t0 = performance.now();
async function pull() {
  try {
    const r = await fetch('/frame.jpg?seq=' + seq, { cache: 'no-store' });
    if (r.status === 200) {
      const s = Number(r.headers.get('x-seq') || 0);
      const b = await r.blob();
      const next = URL.createObjectURL(b);
      v.src = next;
      if (url) URL.revokeObjectURL(url);
      url = next; seq = s; shown += 1;
      const secs = (performance.now() - t0) / 1000;
      hud.textContent = shown / secs > 0 ? (shown / secs).toFixed(1) + ' fps  seq ' + s + '  ' + Math.round(b.size / 1024) + ' KB' : 'live';
    }
  } catch (e) { hud.textContent = 'reconnecting'; await new Promise((r) => setTimeout(r, 500)); }
  requestAnimationFrame(pull);
}
pull();
</script></body></html>`;

const host = (query) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Market Rush — render host</title>
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}
#b{position:fixed;right:8px;top:8px;color:#ffc21a;font:12px system-ui;background:#0008;padding:6px 8px;border-radius:6px}</style></head>
<body><div id="b">starting…</div>
<iframe id="f" src="../index.html?${query}"></iframe>
<script>
const frame = document.getElementById('f');
const badge = document.getElementById('b');
const FPS = Number(new URLSearchParams(location.search).get('fps') || 10);
const QUALITY = Number(new URLSearchParams(location.search).get('q') || 0.82);
let busy = false, last = 0, sent = 0, bytes = 0, t0 = performance.now();
frame.addEventListener('load', () => {
  const w = frame.contentWindow;
  const capture = () => {
    const c = w.document.querySelector('canvas');
    if (!c || busy) return;
    const now = performance.now();
    if (now - last < 1000 / FPS) return;
    last = now; busy = true;
    c.toBlob(async (blob) => {
      if (!blob) { busy = false; return; }
      try {
        await fetch('/frame', { method: 'POST', body: blob });
        sent += 1; bytes += blob.size;
        const secs = (now - t0) / 1000;
        badge.textContent = (sent / secs).toFixed(1) + ' fps out · ' + Math.round(bytes / secs / 1024) + ' KB/s';
      } catch (e) {}
      busy = false;
    }, 'image/jpeg', QUALITY);
  };
  w.__STREAM_CAPTURE = capture;
  badge.textContent = 'waiting for city…';
});
</script></body></html>`;

const send = (res, code, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (p === '/frame' && req.method === 'POST') {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 6e6) { req.destroy(); return; }
    }
    latest = Buffer.concat(chunks);
    seq += 1;
    stats.frames += 1;
    stats.bytes += latest.length;
    stats.lastFrameAt = Date.now();
    for (const w of waiters) w();
    waiters.clear();
    return send(res, 204, '');
  }

  if (p === '/frame.jpg') {
    const since = Number(url.searchParams.get('seq') || 0);
    if (!latest || seq === since) {
      await new Promise((resolve) => {
        const done = () => { waiters.delete(done); resolve(); };
        waiters.add(done);
        setTimeout(done, 8000);
      });
    }
    if (!latest || seq === since) { res.writeHead(204, { 'cache-control': 'no-store' }); return res.end(); }
    res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'no-store', 'x-seq': String(seq) });
    return res.end(latest);
  }

  if (p === '/stats') {
    const secs = (Date.now() - stats.started) / 1000;
    return send(res, 200, JSON.stringify({
      seq, frames: stats.frames, bytes: stats.bytes, kbps: Math.round(stats.bytes / 1024 / Math.max(1, secs)),
      lastFrameAgeMs: stats.lastFrameAt ? Date.now() - stats.lastFrameAt : null,
    }), 'application/json');
  }

  if (p === '/' || p === '/viewer') return send(res, 200, viewer, TYPES['.html']);
  if (p === '/host') return send(res, 200, host(url.searchParams.get('q') || 'phone&r=250&webgl'), TYPES['.html']);

  const safe = path.normalize(path.join(ROOT, decodeURIComponent(p)));
  if (!safe.startsWith(ROOT)) return send(res, 403, 'no');
  try {
    const data = await readFile(safe);
    return send(res, 200, data, TYPES[path.extname(safe).toLowerCase()] || 'application/octet-stream');
  } catch {
    send(res, 404, 'not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`render host:  http://localhost:${PORT}/host`);
  console.log(`phone viewer: http://<this-lan-ip>:${PORT}/`);
});

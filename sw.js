// Service worker: simpan salinan Gaby di perangkat supaya tetap bisa dibuka walau
// GitHub sedang down atau tidak bisa diakses.
// Selalu coba ambil versi terbaru dulu; kalau gagal ATAU dibalas error (404/500),
// pakai salinan bagus terakhir. Halaman error tidak pernah disimpan.

const CACHE = 'gaby-v1';

// File inti yang disimpan sejak awal, supaya salinannya lengkap.
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/apps.js', 'js/audio.js', 'js/brain.js', 'js/calendar.js', 'js/camera.js',
  'js/config.js', 'js/daily.js', 'js/gallery.js', 'js/gemini.js', 'js/imagegen.js', 'js/journal.js',
  'js/location.js', 'js/map.js', 'js/memory.js', 'js/mood.js', 'js/native.js', 'js/openai.js',
  'js/persona.js', 'js/tools.js', 'js/vad.js', 'js/visual.js', 'js/wake.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(CORE.map(async (path) => {
      const res = await fetch(path, { cache: 'reload' });
      if (res.ok) await c.put(path, res);
    }))),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function fromCache(request) {
  const hit = await caches.match(request, { ignoreSearch: true });
  if (hit) return hit;
  // Membuka halaman utama (dengan atau tanpa tambahan alamat) → pakai salinan halaman utama.
  if (request.mode === 'navigate') return (await caches.match('./')) || caches.match('index.html');
  return undefined;
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request);
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }
      // GitHub membalas error (misal repo dihapus): pakai salinan bagus kalau ada.
      return (await fromCache(e.request)) || res;
    } catch {
      // Tidak bisa terhubung (GitHub down / offline).
      return (await fromCache(e.request)) || Response.error();
    }
  })());
});

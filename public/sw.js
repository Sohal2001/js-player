const CACHE = 'jsplayer-v1';
const PRECACHE = [
  './',
  './index.html',
  './assets/',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Never intercept YouTube API / IFrame calls — must go through network
  const url = new URL(e.request.url);
  if (url.hostname.endsWith('youtube.com') || url.hostname.endsWith('ytimg.com') || url.hostname.endsWith('googleapis.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached ?? fetch(e.request).then((res) => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return res;
    }))
  );
});

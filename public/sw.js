// WorkedWith service worker. Deliberately small: it only shows a friendly page when someone is offline.
// It never stores signed in pages, API responses or personal data.
const CACHE = 'ww-offline-v1'
const OFFLINE_URL = '/offline'

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.add(OFFLINE_URL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.mode !== 'navigate') return
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL).then(r => r || Response.error())))
})

const CACHE_NAME = 'ivrit-ktana-v2'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg']
const IS_LOCAL_DEV =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '::1'

self.addEventListener('install', (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => self.registration.unregister()),
    )
    self.skipWaiting()
    return
  }

  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then((clients) => clients.forEach((client) => client.navigate(client.url))),
    )
    return
  }

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (IS_LOCAL_DEV) {
    event.respondWith(fetch(event.request))
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  event.respondWith(staleWhileRevalidate(event.request))
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS') return

  const urls = event.data.urls.filter((url) => {
    try {
      return new URL(url, self.location.origin).origin === self.location.origin
    } catch {
      return false
    }
  })

  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urls)))
})

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          cache.put(request, response.clone())
          return response
        })
        .catch(() => cached)

      return cached || fetched
    }),
  )
}

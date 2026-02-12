// Service Worker for yticapo PWA
// Always fetch latest version, no caching

const CACHE_NAME = 'yticapo-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    // Skip waiting to activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    // Clear all caches on activation
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Always fetch from network, never use cache
    event.respondWith(
        fetch(event.request, {
            cache: 'no-store'
        }).catch(() => {
            // If network fails, return a basic error response
            return new Response('Network error', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
            });
        })
    );
});































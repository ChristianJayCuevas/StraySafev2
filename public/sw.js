"use strict";

const CACHE_NAME = "offline-cache-v1";
const OFFLINE_URL = '/offline.html';
const IMAGE_CACHE = "image-cache-v1";

const filesToCache = [
    OFFLINE_URL,
    '/storage/images/newlogo1.png'  // Cache your default icons
];

self.addEventListener("install", (event) => {
    self.skipWaiting(); // Force activate this SW immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(filesToCache))
    );
});

self.addEventListener("activate", (event) => {
    clients.claim(); // Claim control of uncontrolled clients
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    );
});

// Helper function to cache an image and return its URL
async function cacheImage(imageUrl) {
    // Make sure the URL is absolute
    const url = new URL(imageUrl, self.location.origin).href;
    
    try {
        const cache = await caches.open(IMAGE_CACHE);
        // Check if image is already cached
        const cachedResponse = await cache.match(url);
        
        if (cachedResponse) {
            console.log('[SW] Using cached image:', url);
            return url;
        }
        
        // Fetch and cache the image
        console.log('[SW] Fetching image to cache:', url);
        const response = await fetch(url, {
            mode: 'no-cors',  // This helps with CORS issues
            cache: 'no-cache' // Force fresh fetch
        });
        
        if (response.ok || response.type === 'opaque') {
            await cache.put(url, response.clone());
            console.log('[SW] Image cached successfully:', url);
            return url;
        } else {
            console.error('[SW] Failed to cache image:', response.status);
            return null;
        }
    } catch (error) {
        console.error('[SW] Error caching image:', error, imageUrl);
        return null;
    }
}

self.addEventListener("fetch", (event) => {
    const req = event.request;

    // Don't handle non-GET requests
    if (req.method !== 'GET') return;

    // Handle navigation (HTML pages)
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // Make sure images in /storage/ are handled and cached
    if (req.url.includes('/storage/') && req.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        event.respondWith(
            caches.match(req).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(req)
                    .then((response) => {
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        
                        // Cache a copy of the image response
                        const responseToCache = response.clone();
                        caches.open(IMAGE_CACHE).then((cache) => {
                            cache.put(req, responseToCache);
                        });
                        
                        return response;
                    })
                    .catch(() => {
                        // If network fails and no cache, return a fallback
                        return new Response('Image unavailable', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
        );
        return;
    }

    // Handle other requests
    event.respondWith(
        caches.match(req)
            .then((res) => res || fetch(req).catch(() => {
                return new Response('Resource unavailable', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            }))
    );
});

self.addEventListener('push', async function(event) {
    console.log('[SW] Push received');
    if (event.data) {
        const data = event.data.json();
        console.log('[SW] Push payload:', data);
        
        const options = {
            body: data.body,
            icon: '/storage/images/newlogo1.png',
            badge: '/storage/images/newlogo1.png',
            data: data.data,
            vibrate: [200, 100, 200]
        };

        if (data.image) {
            try {
                // Pre-cache the image to ensure it's available
                const imageUrl = await cacheImage(data.image);
                if (imageUrl) {
                    options.image = imageUrl;
                    console.log('[SW] Image set for notification:', imageUrl);
                } else {
                    console.warn('[SW] Could not prepare image for notification');
                }
            } catch (err) {
                console.error('[SW] Error setting notification image:', err);
            }
        }
        
        if (data.actions) {
            options.actions = data.actions;
        }
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    } else {
        console.log('[SW] Push received with no data');
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.notification.data && event.notification.data.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.action)
        );
    } else {
        // If no specific action, open the app
        event.waitUntil(
            clients.matchAll({type: 'window'}).then(windowClients => {
                // Check if there is already a window/tab open with the target URL
                if (windowClients.length > 0) {
                    // Focus if already open
                    return windowClients[0].focus();
                } else {
                    // Open new window otherwise
                    return clients.openWindow('/notifications');
                }
            })
        );
    }
});
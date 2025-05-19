"use strict";

const CACHE_NAME = "offline-cache-v1";
const OFFLINE_URL = '/offline.html';

const filesToCache = [
    OFFLINE_URL
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
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    );
});


self.addEventListener("fetch", (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch((error) => {
                    console.log('[SW] Fetch failed:', error);
                    return caches.match(OFFLINE_URL);
                })
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    return response || fetch(event.request)
                        .catch((error) => {
                            console.log('[SW] Resource fetch failed:', error, event.request.url);
                            // Return a fallback response for non-navigation requests if possible
                            return new Response('Resource unavailable', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        });
                })
        );
    }
});

self.addEventListener('push', function(event) {
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
    }
});
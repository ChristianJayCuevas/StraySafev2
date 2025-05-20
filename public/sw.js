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

    // Skip interception for image requests in storage
    if (req.url.includes('/storage/images/')) {
        return; // Let the browser handle it
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

        if (data.image){
            options.image = data.image;
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
    }
});
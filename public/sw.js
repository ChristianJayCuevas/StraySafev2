"use strict";

const CACHE_NAME = "offline-cache-v1";
const OFFLINE_URL = '/offline.html';

const filesToCache = [
    OFFLINE_URL
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(filesToCache))
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(OFFLINE_URL);
                })
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    return response || fetch(event.request);
                })
        );
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
// Add this to your existing service worker file

// Handle push events
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/storage/images/newlogo1.png',
            badge: '/storage/images/newlogo1.png',
            data: data.data
        };
        
        if (data.actions) {
            options.actions = data.actions;
        }
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
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
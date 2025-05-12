const CACHE_NAME = 'mozup-v12';
const ASSETS = [
    './',
    './index.html',
    './select-training.html',
    './form.html',
    './style.css',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return Promise.all(
                    ASSETS.map(asset => {
                        return cache.add(asset).catch(error => {
                            console.error('Falha ao armazenar:', asset, error);
                        });
                    })
                );
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
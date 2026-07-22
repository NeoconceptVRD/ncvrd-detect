// Service Worker for NCVRD Detect PWA — v7
const CACHE_NAME = 'ncvrd-detect-v7';

// ════════════════════════════════════════════════════════════════
//  🔔 FIREBASE CLOUD MESSAGING — réception des pushs app fermée
//  try/catch : si le CDN est injoignable au moment de l'install,
//  le SW continue de fonctionner (cache/offline) sans le push.
// ════════════════════════════════════════════════════════════════
try {
  importScripts(
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
  );
  firebase.initializeApp({
    apiKey:            "AIzaSyBSYpQzMenjr7sghERSTs8ABwE9ZrN96VQ",
    authDomain:        "ncvrd-detect.firebaseapp.com",
    projectId:         "ncvrd-detect",
    storageBucket:     "ncvrd-detect.firebasestorage.app",
    messagingSenderId: "480995514129",
    appId:             "1:480995514129:web:d14f81557349e97698deb0"
  });
  const messaging = firebase.messaging();
  // Message reçu pendant que l'app est FERMÉE (ou en arrière-plan)
  messaging.onBackgroundMessage(payload => {
    const d = payload.data || {};
    const n = payload.notification || {};
    const title = n.title || d.title || 'NCVRD Detect';
    const body  = n.body  || d.body  || '';
    self.registration.showNotification(title, {
      body,
      icon: './LOGO.png',
      badge: './LOGO.png',
      tag: d.tag || 'ncvrd-push',
      data: { url: d.url || './' }
    });
  });
} catch (e) {
  // FCM indisponible — le SW reste fonctionnel pour le cache
}

// Clic sur la notification → ouvre (ou refocalise) l'appli
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// Ressources locales à cacher obligatoirement
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/hero-banner.jpg',
  './assets/login-bg.jpg'
];

// Ressources CDN critiques (Firebase + Fonts) — cachées au premier usage
const CDN_ASSETS = [
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js',
  // Polices réellement utilisées par l'app : IBM Plex Sans + IBM Plex Mono
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap'
];

// Libs chargées à la demande (docx, jszip, pdf.js) — cachées au premier usage
const LAZY_CDN = [
  'https://unpkg.com/docx@8.5.0/build/index.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// ── Install : cacher les ressources locales + CDN critiques ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Locales — obligatoires
      await cache.addAll(LOCAL_ASSETS).catch(() => {});
      // CDN critiques — best effort (ne bloque pas l'install)
      for(const url of CDN_ASSETS){
        try { await cache.add(url); } catch(_){}
      }
    })
  );
  self.skipWaiting();
});

// ── Activate : nettoyer les anciens caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// ── Fetch : stratégie réseau-first avec cache fallback ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ignorer les requêtes non-GET
  if(event.request.method !== 'GET') return;

  // Ignorer les requêtes Firebase Firestore/Auth (temps réel, pas cachable)
  if(url.includes('firestore.googleapis.com') ||
     url.includes('identitytoolkit.googleapis.com') ||
     url.includes('securetoken.googleapis.com')) return;

  // Stratégie pour les fonts Google (cache-first, rarement changent)
  if(url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')){
    event.respondWith(
      caches.match(event.request).then(cached => {
        if(cached) return cached;
        return fetch(event.request).then(res => {
          if(res && res.status === 200){
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Stratégie pour les scripts CDN (cache-first — version figée)
  if(url.includes('gstatic.com/firebasejs/') ||
     url.includes('unpkg.com/docx@') ||
     url.includes('cdnjs.cloudflare.com/')){
    event.respondWith(
      caches.match(event.request).then(cached => {
        if(cached) return cached;
        return fetch(event.request).then(res => {
          if(res && res.status === 200){
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Images locales (bannière, fond login…) : rarement modifiées → CACHE-FIRST
  //   (gros gain de vitesse + économie de données, sans risque de contenu périmé)
  if(url.startsWith(self.location.origin) && /\.(png|jpe?g|webp|svg|gif|ico)$/i.test(url.split('?')[0])){
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        if(res && res.status === 200){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // index.html / manifest / autres ressources locales : NETWORK-FIRST
  //   → "actualiser" récupère TOUJOURS la dernière version (attente utilisateur)
  //   → repli sur le cache uniquement hors-ligne
  if(url.startsWith(self.location.origin)){
    event.respondWith(
      fetch(event.request).then(res => {
        if(res && res.status === 200){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
});

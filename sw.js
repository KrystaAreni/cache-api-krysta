const CACHE_NAME = 'krysta-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  'https://via.placeholder.com/250x150/8b008b/ffffff?text=Imagen+1',
  'https://via.placeholder.com/250x150/ff1493/ffffff?text=Imagen+2',
  'https://via.placeholder.com/250x150/9370db/ffffff?text=Imagen+3'
];

// Evento Install - Cacheamos los recursos iniciales
self.addEventListener('install', event => {
  console.log('🛠️ Service Worker v2: Instalando...');
  self.skipWaiting(); // Activar inmediatamente
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cache abierto, agregando recursos...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Todos los recursos cacheados exitosamente');
        return self.skipWaiting();
      })
  );
});

// Evento Activate - Limpiar caches viejos
self.addEventListener('activate', event => {
  console.log('🎉 Service Worker v2 Activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Evento Fetch - Estrategia Cache First mejorada
self.addEventListener('fetch', event => {
  // Solo manejar solicitudes GET
  if (event.request.method !== 'GET') return;
  
  // Excluir algunas solicitudes del cache
  if (event.request.url.includes('chrome-extension') || 
      event.request.url.includes('sockjs-node')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si está en caché, devolver y actualizar en segundo plano
        if (cachedResponse) {
          console.log('✅ Sirviendo desde caché:', event.request.url);
          
          // Actualizar el caché en segundo plano
          fetchAndCache(event.request);
          
          return cachedResponse;
        }
        
        // Si no está en caché, buscar en la red
        console.log('🌐 Buscando en red:', event.request.url);
        return fetchAndCache(event.request);
      })
      .catch(error => {
        console.log('❌ Error en fetch:', error);
        // Podríamos devolver una página offline personalizada
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
        return new Response('🚫 Recurso no disponible - Modo Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// Función auxiliar para fetch y cache
function fetchAndCache(request) {
  return fetch(request)
    .then(networkResponse => {
      // Verificar si la respuesta es válida
      if (!networkResponse || networkResponse.status !== 200) {
        return networkResponse;
      }
      
      // Clonar la respuesta para guardar en caché
      const responseToCache = networkResponse.clone();
      
      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(request, responseToCache);
          console.log('💾 Guardado en caché:', request.url);
        });
      
      return networkResponse;
    })
    .catch(error => {
      console.log('🌐 Error de red:', error);
      throw error;
    });
}

// Manejar mensajes desde la página principal
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
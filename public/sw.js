/* VaultFlow PWA — 生态/天气推送 Service Worker */
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const building = event.notification.data?.buildingType;
  const url = building ? `/#/town/explore?building=${building}` : '/#/town/explore';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'vaultflow-weather-scene', buildingType: building });
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

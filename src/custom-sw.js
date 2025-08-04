self.addEventListener('message', event => {
  const data = event.data;

  if (data?.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification('💧 Hora de beber água!', {
      body: 'Mantenha-se hidratado! Beba um copo de água agora.',
      icon: 'assets/icons/agua.png',
      badge: 'assets/icons/agua.png'
    });
  }
});

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  self.clients.claim();
});

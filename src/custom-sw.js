console.log('💧 [SW] Service Worker ativo');

self.addEventListener('install', event => {
  console.log('🔧 [SW] Instalando...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('🚀 [SW] Ativado!');
  self.clients.claim();
});

self.addEventListener('message', event => {
  const data = event.data;

  if (data?.type === 'SHOW_NOTIFICATION') {
    mostrarNotificacao();
  }
});

function mostrarNotificacao() {
  self.registration.showNotification('💧 Hora de beber água!', {
    body: 'Mantenha-se hidratado!',
    icon: 'assets/icons/agua.png',
    badge: 'assets/icons/agua.png',
    vibrate: [100, 50, 100],
    tag: 'lembrete-agua',
    renotify: true
  });
}

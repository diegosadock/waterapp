// custom-sw.js

let intervalo = 60; // minutos (valor padrão)
let lembreteTimeoutId = null;

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

  if (data?.type === 'SET_INTERVAL') {
    const novo = parseInt(data.minutes);
    if (!isNaN(novo) && novo > 0) {
      intervalo = novo;
      iniciarLembretes();
      console.log('[SW] Intervalo atualizado para', intervalo, 'minutos');
    }
  }

  if (data?.type === 'CANCELAR_LEMBRETES') {
    cancelarLembretes();
  }

  if (data?.type === 'REINICIAR_LEMBRETES') {
    iniciarLembretes();
  }

  if (data?.type === 'SHOW_NOTIFICATION') {
    mostrarNotificacao();
  }
});

function iniciarLembretes() {
  cancelarLembretes();
  agendarProximaNotificacao();
}

function agendarProximaNotificacao() {
  lembreteTimeoutId = setTimeout(() => {
    mostrarNotificacao();
    agendarProximaNotificacao(); // chama recursivamente
  }, intervalo * 60 * 1000);
}

function cancelarLembretes() {
  if (lembreteTimeoutId !== null) {
    clearTimeout(lembreteTimeoutId);
    lembreteTimeoutId = null;
    console.log('[SW] Lembretes cancelados');
  }
}

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

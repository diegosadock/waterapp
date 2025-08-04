// custom-sw.js

let intervalo = null;       // Tempo entre notificações em minutos
let lembreteTimeout = null; // Referência para cancelamento de setTimeout

console.log('💧 Service Worker carregado e ativo');


self.addEventListener('message', event => {
  const data = event.data;

  if (data?.type === 'SET_INTERVAL') {
    intervalo = data.minutes;
    cancelarNotificacoes(); // Garante que anterior pare
    iniciarNotificacoes();
  }

  if (data?.type === 'CANCELAR_LEMBRETES') {
    cancelarNotificacoes();
  }

  if (data?.type === 'REINICIAR_LEMBRETES') {
    cancelarNotificacoes();
    iniciarNotificacoes();
  }
});

function cancelarNotificacoes() {
  if (lembreteTimeout !== null) {
    clearTimeout(lembreteTimeout);
    lembreteTimeout = null;
  }
}

function iniciarNotificacoes() {
  if (!intervalo || intervalo <= 0) return;

  // Agendamento recursivo
  const agendarNotificacao = () => {
    lembreteTimeout = setTimeout(() => {
      self.registration.showNotification('💧 Hora de beber água!', {
        body: 'Mantenha-se hidratado! Beba um copo de água agora.',
        icon: 'assets/icons/agua.png',
        badge: 'assets/icons/agua.png'
      });
      agendarNotificacao(); // Agendar próxima
    }, intervalo * 60 * 1000);
  };

  agendarNotificacao();
}

// Garante ativação imediata após instalação
self.addEventListener('install', event => {
  console.log('🔧 [SW] Instalando...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('🚀 [SW] Ativado e pronto!');
  self.clients.claim();
});


let intervalo = null;
let lembreteTimeout = null;
let abasAbertas = 0;

console.log('💧 Service Worker carregado e ativo');

self.addEventListener('message', event => {
  const data = event.data;

  if (data?.type === 'SET_INTERVAL') {
    const novoIntervalo = parseFloat(data.minutes);
    if (!isNaN(novoIntervalo) && novoIntervalo >= 1) {
      intervalo = novoIntervalo;
      cancelarNotificacoes();
      iniciarNotificacoes();
    } else {
      console.warn('[SW] Intervalo inválido recebido:', data.minutes);
    }
  }

  if (data?.type === 'CANCELAR_LEMBRETES') {
    cancelarNotificacoes();
  }

  if (data?.type === 'REINICIAR_LEMBRETES') {
    if (abasAbertas > 0) {
      cancelarNotificacoes();
      iniciarNotificacoes();
    }
  }

  if (data?.type === 'ABA_ABERTA') {
    abasAbertas++;
    if (abasAbertas === 1 && intervalo > 0) {
      iniciarNotificacoes();
    }
    console.log(`[SW] Aba aberta, total: ${abasAbertas}`);
  }

  if (data?.type === 'ABA_FECHADA') {
    abasAbertas--;
    if (abasAbertas <= 0) {
      abasAbertas = 0;
      cancelarNotificacoes();
      console.log('[SW] Todas as abas fechadas, notificações paradas');
    } else {
      console.log(`[SW] Aba fechada, ainda abertas: ${abasAbertas}`);
    }
  }
});

function cancelarNotificacoes() {
  if (lembreteTimeout !== null) {
    clearTimeout(lembreteTimeout);
    lembreteTimeout = null;
    console.log('[SW] Notificações canceladas');
  }
}

function iniciarNotificacoes() {
  if (!intervalo || intervalo < 1) return;

  console.log('[SW] Iniciando notificações a cada', intervalo, 'minuto(s)');

  const agendarNotificacao = () => {
    lembreteTimeout = setTimeout(() => {
      self.registration.showNotification('💧 Hora de beber água!', {
        body: 'Mantenha-se hidratado! Beba um copo de água agora.',
        icon: 'assets/icons/agua.png',
        badge: 'assets/icons/agua.png'
      });
      agendarNotificacao();
    }, intervalo * 60 * 1000);
  };

  agendarNotificacao();
}

self.addEventListener('install', event => {
  console.log('🔧 [SW] Instalando...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('🚀 [SW] Ativado e pronto!');
  self.clients.claim();
});
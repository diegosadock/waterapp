import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

// Verifica suporte a SW e Notificações
if ('serviceWorker' in navigator && 'Notification' in window) {
  // Solicita permissão se necessário
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        registrarSW();
      }
    });
  } else {
    registrarSW();
  }
}

function registrarSW() {
  navigator.serviceWorker
    .register('/custom-sw.js')
    .then(registration => {
      console.log('✅ Service Worker registrado:', registration);

      // Atualiza o SW e recarrega página se necessário
      registration.onupdatefound = () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.onstatechange = () => {
            if (newWorker.state === 'activated') {
              console.log('🔄 Novo SW ativado. Recarregando página...');
              window.location.reload();
            }
          };
        }
      };

      navigator.serviceWorker.ready.then(reg => {
        const aguaApp = localStorage.getItem('aguaApp');
        let intervalo = 60;
        let notificacaoAtiva = false;

        if (aguaApp) {
          try {
            const parsed = JSON.parse(aguaApp);
            intervalo = parsed.intervaloMinutos > 0 ? parsed.intervaloMinutos : 60;
            notificacaoAtiva = parsed.notificacaoAtiva ?? false;
          } catch (e) {
            console.warn('⚠️ Erro ao ler localStorage:', e);
          }
        }

        if (reg.active && notificacaoAtiva) {
          reg.active.postMessage({ type: 'SET_INTERVAL', minutes: Number(intervalo) });
          reg.active.postMessage({ type: 'ABA_ABERTA' });
          console.log(`📩 Intervalo de ${intervalo} minuto(s) enviado ao SW.`);
        } else {
          console.log('🔕 Notificações estão desativadas ou SW inativo.');
        }
      });
    })
    .catch(err => console.error('❌ Erro ao registrar SW:', err));
}

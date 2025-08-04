import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));

if ('Notification' in window) {
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('Permissão para notificações:', permission);
      if (permission === 'granted') {
        registrarSW();
      }
    });
  } else if (Notification.permission === 'granted') {
    registrarSW();
  }
}

function registrarSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/custom-sw.js')
      .then(registration => {
        console.log('Service Worker registrado:', registration);

        // Detecta atualização do SW e força reload para ativar novo SW
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('Nova versão do SW encontrada, estado:', newWorker.state);
            newWorker.onstatechange = () => {
              console.log('Estado do novo SW:', newWorker.state);
              if (newWorker.state === 'activated') {
                console.log('Novo SW ativado, recarregando a página...');
                window.location.reload();
              }
            };
          }
        };

        // Tenta recuperar o intervalo do localStorage
        const aguaApp = localStorage.getItem('aguaApp');
        let intervalo = 60; // valor padrão
        if (aguaApp) {
          try {
            const parsed = JSON.parse(aguaApp);
            if (parsed.intervaloMinutos && parsed.intervaloMinutos > 0) {
              intervalo = parsed.intervaloMinutos;
            }
          } catch (e) {
            console.warn('Erro ao ler intervalo do localStorage:', e);
          }
        }

        const mensagem = { type: 'SET_INTERVAL', minutes: Number(intervalo) };

        if (registration.active) {
          registration.active.postMessage(mensagem);
        } else {
          navigator.serviceWorker.ready.then(reg => {
            if (reg.active) {
              reg.active.postMessage(mensagem);
            }
          });
        }
      })
      .catch(err => console.error('Erro ao registrar SW:', err));
  }
}
